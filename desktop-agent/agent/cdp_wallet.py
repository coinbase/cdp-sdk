"""CDP MPC wallet and Smart Account management."""

from __future__ import annotations

import logging
from dataclasses import dataclass

from cdp import CdpClient
from cdp.evm_call_types import EncodedCall
from cdp.evm_smart_account import EvmSmartAccount
from eth_account import Account
from web3 import Web3

from config.settings import AgentSettings

logger = logging.getLogger(__name__)


@dataclass
class WalletBundle:
    cdp: CdpClient
    owner: Account
    smart_account: EvmSmartAccount
    network_account: object
    paymaster_url: str | None
    w3: Web3


class CdpWalletManager:
    """Initialize developer-custodied MPC wallets via CDP SDK."""

    def __init__(self, settings: AgentSettings) -> None:
        self.settings = settings
        self._bundle: WalletBundle | None = None

    async def initialize(self) -> WalletBundle:
        owner = Account.from_key(self.settings.owner_private_key)
        cdp = CdpClient(
            api_key_id=self.settings.cdp_api_key_id,
            api_key_secret=self.settings.cdp_api_key_secret,
            wallet_secret=self.settings.cdp_wallet_secret,
        )

        smart_account = await cdp.evm.get_or_create_smart_account(
            name=self.settings.agent_name,
            owner=owner,
        )
        network_account = await smart_account.__experimental_use_network__(
            self.settings.network,
            rpc_url=self.settings.rpc_url,
        )

        paymaster_url = self.settings.paymaster_rpc_url
        w3 = Web3(Web3.HTTPProvider(self.settings.rpc_url))

        logger.info("Smart account ready: %s on %s", smart_account.address, self.settings.network)
        logger.info("Owner EOA: %s", owner.address)
        logger.info("RPC endpoint configured (paymaster-capable): %s", bool(paymaster_url))

        self._bundle = WalletBundle(
            cdp=cdp,
            owner=owner,
            smart_account=smart_account,
            network_account=network_account,
            paymaster_url=paymaster_url,
            w3=w3,
        )
        return self._bundle

    @property
    def bundle(self) -> WalletBundle:
        if self._bundle is None:
            raise RuntimeError("Wallet manager not initialized. Call initialize() first.")
        return self._bundle

    async def send_contract_call(
        self,
        to: str,
        data: str,
        value: str = "0",
    ):
        """Execute a contract call via CDP Smart Account user operation with paymaster."""
        call = EncodedCall(to=to, data=data, value=value)
        return await self.bundle.network_account.send_user_operation(
            calls=[call],
            paymaster_url=self.bundle.paymaster_url,
        )

    async def close(self) -> None:
        if self._bundle is not None:
            await self._bundle.cdp.close()
            self._bundle = None
