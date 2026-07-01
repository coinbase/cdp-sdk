// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IMorpho {
    struct MarketParams {
        address loanToken;
        address collateralToken;
        address oracle;
        address irm;
        uint256 lltv;
    }

    function flashLoan(address token, uint256 assets, bytes calldata data) external;

    function liquidate(
        MarketParams memory marketParams,
        address borrower,
        uint256 seizedAssets,
        uint256 repaidShares,
        bytes calldata data
    ) external returns (uint256, uint256);
}

interface IMorphoFlashLoanCallback {
    function onMorphoFlashLoan(uint256 assets, bytes calldata data) external;
}

interface ISwapRouter02 {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

/// @title MorphoFlashLiquidator
/// @notice Atomic Morpho Blue flash-loan liquidation with Uniswap V3 collateral swap-back.
/// @dev Morpho flash loans are zero-fee. Designed for CDP Smart Account ownership.
contract MorphoFlashLiquidator is IMorphoFlashLoanCallback, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct LiquidationParams {
        IMorpho.MarketParams market;
        address borrower;
        uint256 repaidShares;
        uint24 swapFee;
        uint256 minAmountOut;
    }

    IMorpho public immutable MORPHO;
    ISwapRouter02 public immutable SWAP_ROUTER;

    event MorphoLiquidationExecuted(
        address indexed borrower,
        address indexed collateralToken,
        address indexed loanToken,
        uint256 repaidAssets,
        uint256 profit
    );

    error OnlyMorpho();
    error InsufficientProfit();
    error SwapFailed();

    constructor(address morpho, address swapRouter, address owner_) Ownable(owner_) {
        MORPHO = IMorpho(morpho);
        SWAP_ROUTER = ISwapRouter02(swapRouter);
    }

    /// @notice Initiate a zero-fee Morpho flash loan to liquidate an unhealthy position.
    function liquidate(
        address loanToken,
        uint256 flashAmount,
        LiquidationParams calldata params
    ) external onlyOwner nonReentrant {
        MORPHO.flashLoan(loanToken, flashAmount, abi.encode(params));
    }

    /// @inheritdoc IMorphoFlashLoanCallback
    function onMorphoFlashLoan(uint256 assets, bytes calldata data) external {
        if (msg.sender != address(MORPHO)) revert OnlyMorpho();

        LiquidationParams memory lp = abi.decode(data, (LiquidationParams));
        IERC20 loanToken = IERC20(lp.market.loanToken);

        loanToken.forceApprove(address(MORPHO), assets);

        (, uint256 repaidAssets) = MORPHO.liquidate(lp.market, lp.borrower, 0, lp.repaidShares, "");

        if (lp.market.collateralToken != lp.market.loanToken) {
            IERC20 collateral = IERC20(lp.market.collateralToken);
            uint256 collateralBalance = collateral.balanceOf(address(this));
            if (collateralBalance > 0) {
                collateral.forceApprove(address(SWAP_ROUTER), collateralBalance);
                uint256 swapped = SWAP_ROUTER.exactInputSingle(
                    ISwapRouter02.ExactInputSingleParams({
                        tokenIn: lp.market.collateralToken,
                        tokenOut: lp.market.loanToken,
                        fee: lp.swapFee,
                        recipient: address(this),
                        amountIn: collateralBalance,
                        amountOutMinimum: lp.minAmountOut,
                        sqrtPriceLimitX96: 0
                    })
                );
                if (swapped < lp.minAmountOut) revert SwapFailed();
            }
        }

        uint256 loanBalance = loanToken.balanceOf(address(this));
        if (loanBalance < assets) revert InsufficientProfit();

        loanToken.forceApprove(address(MORPHO), assets);

        uint256 profit = loanBalance - assets;
        if (profit > 0) {
            loanToken.safeTransfer(owner(), profit);
        }

        emit MorphoLiquidationExecuted(
            lp.borrower,
            lp.market.collateralToken,
            lp.market.loanToken,
            repaidAssets,
            profit
        );
    }

    function rescueToken(address token, uint256 amount) external onlyOwner nonReentrant {
        IERC20(token).safeTransfer(owner(), amount);
    }

    receive() external payable {}
}
