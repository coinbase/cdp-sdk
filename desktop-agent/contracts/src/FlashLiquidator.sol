// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IPool} from "aave-v3-core/contracts/interfaces/IPool.sol";
import {IPoolAddressesProvider} from "aave-v3-core/contracts/interfaces/IPoolAddressesProvider.sol";
import {IFlashLoanSimpleReceiver} from "aave-v3-core/contracts/flashloan/interfaces/IFlashLoanSimpleReceiver.sol";

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

/// @title FlashLiquidator
/// @notice Atomic Aave V3 flash-loan liquidation executor with Uniswap V3 collateral swap-back.
/// @dev Designed for CDP Smart Account ownership and paymaster-sponsored deployment/execution.
contract FlashLiquidator is IFlashLoanSimpleReceiver, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct LiquidationParams {
        address collateralAsset;
        address debtAsset;
        address user;
        uint256 debtToCover;
        uint24 swapFee;
        uint256 minAmountOut;
    }

    IPool public immutable POOL;
    ISwapRouter02 public immutable SWAP_ROUTER;
    IPoolAddressesProvider public immutable ADDRESSES_PROVIDER;

    event LiquidationExecuted(
        address indexed user,
        address indexed collateralAsset,
        address indexed debtAsset,
        uint256 debtCovered,
        uint256 profit
    );

    error OnlyPool();
    error InvalidInitiator();
    error InsufficientProfit();
    error SwapFailed();

    constructor(address addressesProvider, address swapRouter, address owner_) Ownable(owner_) {
        ADDRESSES_PROVIDER = IPoolAddressesProvider(addressesProvider);
        POOL = IPool(ADDRESSES_PROVIDER.getPool());
        SWAP_ROUTER = ISwapRouter02(swapRouter);
    }

    /// @notice Initiate an atomic flash-loan liquidation of an undercollateralized Aave position.
    function liquidate(
        address debtAsset,
        uint256 flashAmount,
        LiquidationParams calldata params
    ) external onlyOwner nonReentrant {
        POOL.flashLoanSimple(
            address(this),
            debtAsset,
            flashAmount,
            abi.encode(params),
            0
        );
    }

    /// @inheritdoc IFlashLoanSimpleReceiver
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        if (msg.sender != address(POOL)) revert OnlyPool();
        if (initiator != address(this)) revert InvalidInitiator();

        LiquidationParams memory lp = abi.decode(params, (LiquidationParams));
        if (lp.debtAsset != asset) revert SwapFailed();

        IERC20 debtToken = IERC20(asset);
        debtToken.forceApprove(address(POOL), amount);

        POOL.liquidationCall(
            lp.collateralAsset,
            lp.debtAsset,
            lp.user,
            lp.debtToCover,
            false
        );

        uint256 debtBalance = debtToken.balanceOf(address(this));
        if (lp.collateralAsset != lp.debtAsset) {
            IERC20 collateral = IERC20(lp.collateralAsset);
            uint256 collateralBalance = collateral.balanceOf(address(this));
            if (collateralBalance > 0) {
                collateral.forceApprove(address(SWAP_ROUTER), collateralBalance);
                uint256 swapped = SWAP_ROUTER.exactInputSingle(
                    ISwapRouter02.ExactInputSingleParams({
                        tokenIn: lp.collateralAsset,
                        tokenOut: lp.debtAsset,
                        fee: lp.swapFee,
                        recipient: address(this),
                        amountIn: collateralBalance,
                        amountOutMinimum: lp.minAmountOut,
                        sqrtPriceLimitX96: 0
                    })
                );
                if (swapped < lp.minAmountOut) revert SwapFailed();
                debtBalance = debtToken.balanceOf(address(this));
            }
        }

        uint256 repayment = amount + premium;
        if (debtBalance < repayment) revert InsufficientProfit();

        debtToken.forceApprove(address(POOL), repayment);

        uint256 profit = debtBalance - repayment;
        if (profit > 0) {
            debtToken.safeTransfer(owner(), profit);
        }

        emit LiquidationExecuted(lp.user, lp.collateralAsset, lp.debtAsset, lp.debtToCover, profit);
        return true;
    }

    /// @notice Rescue ERC20 tokens sent to the contract (excluding active flash loan callback).
    function rescueToken(address token, uint256 amount) external onlyOwner nonReentrant {
        IERC20(token).safeTransfer(owner(), amount);
    }

    receive() external payable {}
}
