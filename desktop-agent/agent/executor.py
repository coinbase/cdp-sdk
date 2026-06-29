"""Execute atomic flash-loan liquidations via CDP Smart Account + FlashLiquidator contract."""

from __future__ import annotations

import logging
from dataclasses import dataclass

from eth_abi import encode
from web3 import Web3

from agent.cdp_wallet import CdpWalletManager
from agent.protocols.aave_v3_base import FLASH_LIQUIDATOR_ABI, UNISWAP_V3_SWAP_ROUTER_BASE, get_aave_addresses
from agent.scanner import LiquidationTarget
from config.settings import AgentSettings

logger = logging.getLogger(__name__)


@dataclass
class ExecutionResult:
    target: LiquidationTarget
    user_op_hash: str | None
    status: str
    message: str


class FlashLiquidationExecutor:
    """Craft and submit flash liquidation user operations."""

    def __init__(self, settings: AgentSettings, wallet: CdpWalletManager) -> None:
        self.settings = settings
        self.wallet = wallet
        self.addresses = get_aave_addresses(settings.network)

    def _require_contract(self) -> str:
        if not self.settings.flash_liquidator_address:
            raise ValueError(
                "FLASH_LIQUIDATOR_ADDRESS is not set. Deploy the contract first via "
                "scripts/deploy_contract.py"
            )
        return Web3.to_checksum_address(self.settings.flash_liquidator_address)

    def encode_liquidate_call(self, target: LiquidationTarget) -> str:
        contract = self.wallet.bundle.w3.eth.contract(
            address=self._require_contract(),
            abi=FLASH_LIQUIDATOR_ABI,
        )
        params = (
            Web3.to_checksum_address(target.collateral_asset),
            Web3.to_checksum_address(target.debt_asset),
            Web3.to_checksum_address(target.user),
            target.debt_to_cover,
            target.swap_fee,
            target.debt_to_cover,
        )
        fn = contract.functions.liquidate(
            Web3.to_checksum_address(target.debt_asset),
            target.flash_amount,
            params,
        )
        return fn._encode_transaction_data()

    async def execute(self, target: LiquidationTarget) -> ExecutionResult:
        try:
            data = self.encode_liquidate_call(target)
            user_op = await self.wallet.send_contract_call(
                to=self._require_contract(),
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
                message=f"Liquidation submitted for {target.user}",
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

    @staticmethod
    def encode_constructor_args(owner: str) -> bytes:
        addresses = get_aave_addresses("base")
        return encode(
            ["address", "address", "address"],
            [
                Web3.to_checksum_address(addresses["pool_addresses_provider"]),
                Web3.to_checksum_address(UNISWAP_V3_SWAP_ROUTER_BASE),
                Web3.to_checksum_address(owner),
            ],
        )
