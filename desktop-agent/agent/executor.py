"""Execute atomic flash-loan liquidations via CDP Smart Account + liquidator contracts."""

from __future__ import annotations

import logging
from dataclasses import dataclass

from eth_abi import encode
from web3 import Web3

from agent.cdp_wallet import CdpWalletManager
from agent.protocols.aave_v3_base import FLASH_LIQUIDATOR_ABI, UNISWAP_V3_SWAP_ROUTER_BASE, get_aave_addresses
from agent.protocols.morpho_base import MORPHO_FLASH_LIQUIDATOR_ABI, MORPHO_BLUE_BASE
from agent.models import LiquidationTarget
from config.settings import AgentSettings

logger = logging.getLogger(__name__)


@dataclass
class ExecutionResult:
    target: LiquidationTarget
    user_op_hash: str | None
    status: str
    message: str


class FlashLiquidationExecutor:
    """Craft and submit flash liquidation user operations for Aave V3 and Morpho Blue."""

    def __init__(self, settings: AgentSettings, wallet: CdpWalletManager) -> None:
        self.settings = settings
        self.wallet = wallet
        self.addresses = get_aave_addresses(settings.network)

    def _require_aave_contract(self) -> str:
        if not self.settings.flash_liquidator_address:
            raise ValueError(
                "FLASH_LIQUIDATOR_ADDRESS is not set. Deploy via scripts/deploy_contract.py"
            )
        return Web3.to_checksum_address(self.settings.flash_liquidator_address)

    def _require_morpho_contract(self) -> str:
        if not self.settings.morpho_flash_liquidator_address:
            raise ValueError(
                "MORPHO_FLASH_LIQUIDATOR_ADDRESS is not set. Deploy via scripts/deploy_contract.py --morpho"
            )
        return Web3.to_checksum_address(self.settings.morpho_flash_liquidator_address)

    def _contract_for(self, target: LiquidationTarget) -> str:
        if target.protocol_id == "morpho":
            return self._require_morpho_contract()
        if target.protocol_id == "aave-v3":
            return self._require_aave_contract()
        raise ValueError(f"Protocol {target.protocol_id} is not executable")

    def encode_liquidate_call(self, target: LiquidationTarget) -> str:
        if target.protocol_id == "morpho":
            return self._encode_morpho_call(target)
        return self._encode_aave_call(target)

    def _encode_aave_call(self, target: LiquidationTarget) -> str:
        contract = self.wallet.bundle.w3.eth.contract(
            address=self._require_aave_contract(),
            abi=FLASH_LIQUIDATOR_ABI,
        )
        min_out = self._min_swap_out(target)
        params = (
            Web3.to_checksum_address(target.collateral_asset),
            Web3.to_checksum_address(target.debt_asset),
            Web3.to_checksum_address(target.user),
            target.debt_to_cover,
            target.swap_fee,
            min_out,
        )
        fn = contract.functions.liquidate(
            Web3.to_checksum_address(target.debt_asset),
            target.flash_amount,
            params,
        )
        return fn._encode_transaction_data()

    def _encode_morpho_call(self, target: LiquidationTarget) -> str:
        if not target.oracle_address or not target.irm_address or target.repaid_shares <= 0:
            raise ValueError("Morpho target missing market params (oracle, irm, repaid_shares)")

        contract = self.wallet.bundle.w3.eth.contract(
            address=self._require_morpho_contract(),
            abi=MORPHO_FLASH_LIQUIDATOR_ABI,
        )
        market = (
            Web3.to_checksum_address(target.debt_asset),
            Web3.to_checksum_address(target.collateral_asset),
            Web3.to_checksum_address(target.oracle_address),
            Web3.to_checksum_address(target.irm_address),
            target.lltv_wad,
        )
        min_out = self._min_swap_out(target)
        params = (
            market,
            Web3.to_checksum_address(target.user),
            target.repaid_shares,
            target.swap_fee,
            min_out,
        )
        fn = contract.functions.liquidate(
            Web3.to_checksum_address(target.debt_asset),
            target.flash_amount,
            params,
        )
        return fn._encode_transaction_data()

    @staticmethod
    def _min_swap_out(target: LiquidationTarget) -> int:
        """Minimum swap output to cover flash repayment (with small buffer)."""
        buffer_bps = 100  # 1% safety margin on minOut
        return target.flash_amount + (target.flash_amount * buffer_bps // 10_000)

    async def execute(self, target: LiquidationTarget) -> ExecutionResult:
        try:
            data = self.encode_liquidate_call(target)
            contract = self._contract_for(target)
            smart_account = self.wallet.bundle.smart_account.address

            if self.settings.simulate_before_execute:
                try:
                    self.wallet.bundle.w3.eth.call(
                        {
                            "from": smart_account,
                            "to": contract,
                            "data": data,
                        }
                    )
                except Exception as sim_exc:
                    return ExecutionResult(
                        target=target,
                        user_op_hash=None,
                        status="simulation_failed",
                        message=f"Simulation reverted: {sim_exc}",
                    )

            user_op = await self.wallet.send_contract_call(
                to=contract,
                data=data,
            )
            receipt = await self.wallet.bundle.network_account.wait_for_user_operation(
                user_op_hash=user_op.user_op_hash,
                timeout_seconds=120,
            )
            return ExecutionResult(
                target=target,
                user_op_hash=user_op.user_op_hash,
                status=receipt.status,
                message=f"{target.protocol_name} liquidation submitted for {target.user}",
            )
        except Exception as exc:
            logger.exception("Liquidation execution failed")
            return ExecutionResult(
                target=target,
                user_op_hash=None,
                status="failed",
                message=str(exc),
            )

    def get_deploy_bytecode_hint(self) -> dict[str, str]:
        """Return constructor args for manual verification."""
        return {
            "addresses_provider": self.addresses["pool_addresses_provider"],
            "swap_router": UNISWAP_V3_SWAP_ROUTER_BASE,
            "owner": self.wallet.bundle.smart_account.address,
        }

    def get_morpho_deploy_hint(self) -> dict[str, str]:
        return {
            "morpho": MORPHO_BLUE_BASE,
            "swap_router": UNISWAP_V3_SWAP_ROUTER_BASE,
            "owner": self.wallet.bundle.smart_account.address,
        }

    @staticmethod
    def encode_aave_constructor_args(owner: str) -> bytes:
        addresses = get_aave_addresses("base")
        return encode(
            ["address", "address", "address"],
            [
                Web3.to_checksum_address(addresses["pool_addresses_provider"]),
                Web3.to_checksum_address(UNISWAP_V3_SWAP_ROUTER_BASE),
                Web3.to_checksum_address(owner),
            ],
        )

    @staticmethod
    def encode_morpho_constructor_args(owner: str) -> bytes:
        return encode(
            ["address", "address", "address"],
            [
                Web3.to_checksum_address(MORPHO_BLUE_BASE),
                Web3.to_checksum_address(UNISWAP_V3_SWAP_ROUTER_BASE),
                Web3.to_checksum_address(owner),
            ],
        )

    @staticmethod
    def encode_constructor_args(owner: str) -> bytes:
        return FlashLiquidationExecutor.encode_aave_constructor_args(owner)
