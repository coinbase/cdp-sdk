"""
Functions to convert existing EVM smart accounts to network-scoped versions.
"""

from typing import Any, Dict, Literal, Callable

from cdp.evm_smart_account import EvmSmartAccount
from cdp.network_capabilities import is_method_supported_on_network
from cdp.actions.evm.swap.types import SmartAccountSwapOptions
from cdp.evm_call_types import ContractCall


class ToNetworkScopedEvmSmartAccountOptions:
    """Options for converting a pre-existing EvmSmartAccount to a NetworkScopedEvmSmartAccount."""
    
    def __init__(self, smart_account: EvmSmartAccount, network: str, owner=None):
        """
        Initialize the options.
        
        Args:
            smart_account: The EvmSmartAccount that was previously created.
            network: The network to scope the account to.
            owner: The owner account for the smart account.
        """
        self.smart_account = smart_account
        self.network = network
        self.owner = owner


class NetworkScopedEvmSmartAccount:
    """
    A network-scoped EVM smart account that only exposes methods supported by the network.
    Uses dynamic attribute access to match the TypeScript approach.
    """
    def __init__(self, evm_smart_account: EvmSmartAccount, network: str, rpc_url: str | None = None, owner=None):
        self._evm_smart_account = evm_smart_account
        self._network = network
        self._rpc_url = rpc_url
        self._owner = owner or (evm_smart_account.owners[0] if evm_smart_account.owners else None)
        self._supported_methods: dict[str, Callable] = {}
        self._init_supported_methods()

    def _init_supported_methods(self):
        # Always include base methods
        self._supported_methods["send_user_operation"] = self._network_scoped_send_user_operation
        self._supported_methods["wait_for_user_operation"] = self._network_scoped_wait_for_user_operation
        self._supported_methods["get_user_operation"] = self._network_scoped_get_user_operation
        self._supported_methods["wait_for_transaction_receipt"] = self._network_scoped_wait_for_transaction_receipt
        # Conditionally add network-specific methods
        if is_method_supported_on_network("transfer", self._network):
            self._supported_methods["transfer"] = self._network_scoped_transfer
        if is_method_supported_on_network("listTokenBalances", self._network):
            self._supported_methods["list_token_balances"] = self._network_scoped_list_token_balances
        if is_method_supported_on_network("requestFaucet", self._network):
            self._supported_methods["request_faucet"] = self._network_scoped_request_faucet
        if is_method_supported_on_network("quoteFund", self._network):
            self._supported_methods["quote_fund"] = self._network_scoped_quote_fund
        if is_method_supported_on_network("fund", self._network):
            self._supported_methods["fund"] = self._network_scoped_fund
            self._supported_methods["wait_for_fund_operation_receipt"] = self._network_scoped_wait_for_fund_operation_receipt
        if is_method_supported_on_network("quoteSwap", self._network):
            self._supported_methods["quote_swap"] = self._network_scoped_quote_swap
        if is_method_supported_on_network("swap", self._network):
            self._supported_methods["swap"] = self._network_scoped_swap

    def __getattr__(self, name: str) -> Any:
        if name in self._supported_methods:
            return self._supported_methods[name]
        # Allow access to some properties
        if name == "network":
            return self._network
        if name == "rpc_url":
            return self._rpc_url
        if name == "owner":
            return self._owner
        if name == "address":
            return self._evm_smart_account.address
        if name == "name":
            return self._evm_smart_account.name
        if name == "policies":
            return self._evm_smart_account.policies
        raise AttributeError(f"'{type(self).__name__}' object has no attribute '{name}'")

    async def _network_scoped_send_user_operation(
        self,
        calls: list[ContractCall],
        paymaster_url: str | None = None,
    ):
        return await self._evm_smart_account.send_user_operation(
            calls=calls,
            network=self._network,
            paymaster_url=paymaster_url,
        )

    async def _network_scoped_wait_for_user_operation(
        self,
        user_op_hash: str,
        timeout_seconds: float = 20,
        interval_seconds: float = 0.2,
    ):
        return await self._evm_smart_account.wait_for_user_operation(
            user_op_hash=user_op_hash,
            timeout_seconds=timeout_seconds,
            interval_seconds=interval_seconds,
        )

    async def _network_scoped_get_user_operation(
        self,
        user_op_hash: str,
    ):
        return await self._evm_smart_account.get_user_operation(user_op_hash=user_op_hash)

    async def _network_scoped_transfer(
        self,
        to: str,
        amount: int,
        token: str,
        paymaster_url: str | None = None,
    ):
        return await self._evm_smart_account.transfer(
            to=to,
            amount=amount,
            token=token,
            network=self._network,
            paymaster_url=paymaster_url,
        )

    async def _network_scoped_list_token_balances(
        self,
        page_size: int | None = None,
        page_token: str | None = None,
    ):
        return await self._evm_smart_account.list_token_balances(
            network=self._network,
            page_size=page_size,
            page_token=page_token,
        )

    async def _network_scoped_request_faucet(
        self,
        token: str,
    ) -> str:
        return await self._evm_smart_account.request_faucet(
            network=self._network,
            token=token,
        )

    async def _network_scoped_quote_fund(
        self,
        amount: int,
        token: Literal["eth", "usdc"],
    ):
        return await self._evm_smart_account.quote_fund(
            network=self._network,
            amount=amount,
            token=token,
        )

    async def _network_scoped_fund(
        self,
        amount: int,
        token: Literal["eth", "usdc"],
    ):
        return await self._evm_smart_account.fund(
            network=self._network,
            amount=amount,
            token=token,
        )

    async def _network_scoped_wait_for_fund_operation_receipt(
        self,
        transfer_id: str,
        timeout_seconds: float = 900,
        interval_seconds: float = 1,
    ):
        return await self._evm_smart_account.wait_for_fund_operation_receipt(
            transfer_id=transfer_id,
            timeout_seconds=timeout_seconds,
            interval_seconds=interval_seconds,
        )

    async def _network_scoped_quote_swap(
        self,
        from_token: str,
        to_token: str,
        from_amount: str | int,
        slippage_bps: int | None = None,
        paymaster_url: str | None = None,
        idempotency_key: str | None = None,
    ):
        return await self._evm_smart_account.quote_swap(
            from_token=from_token,
            to_token=to_token,
            from_amount=from_amount,
            network=self._network,
            slippage_bps=slippage_bps,
            paymaster_url=paymaster_url,
            idempotency_key=idempotency_key,
        )

    async def _network_scoped_swap(
        self,
        options: SmartAccountSwapOptions,
    ):
        if not hasattr(options, 'network') or getattr(options, 'network', None) is None:
            options.network = self._network
        return await self._evm_smart_account.swap(options)

    async def _network_scoped_wait_for_transaction_receipt(
        self,
        transaction_hash: str,
        timeout_seconds: float = 20,
        interval_seconds: float = 0.2,
        rpc_url: str | None = None,
    ) -> dict:
        return await self._evm_smart_account.wait_for_transaction_receipt(
            transaction_hash=transaction_hash,
            network=self._network,
            timeout_seconds=timeout_seconds,
            interval_seconds=interval_seconds,
            rpc_url=rpc_url or self._rpc_url,
        )


async def to_network_scoped_evm_smart_account(
    options: ToNetworkScopedEvmSmartAccountOptions,
) -> NetworkScopedEvmSmartAccount:
    """
    Creates a Network-scoped Smart Account instance from an existing EvmSmartAccount.
    Use this to interact with previously deployed EvmSmartAccounts on a specific network.
    
    Args:
        options: Configuration options containing the smart account, network, and owner
        
    Returns:
        A configured NetworkScopedEvmSmartAccount instance ready for network-specific operations
        
    Example:
        ```python
        # Create a network-scoped smart account
        network_smart_account = await to_network_scoped_evm_smart_account(
            ToNetworkScopedEvmSmartAccountOptions(
                smart_account=existing_smart_account,
                network="base",
                owner=owner_account
            )
        )
        
        # Now you can use network-specific methods
        await network_smart_account.list_token_balances()
        await network_smart_account.quote_fund(amount=1000000, token="usdc")
        ```
    """
    return NetworkScopedEvmSmartAccount(
        evm_smart_account=options.smart_account,
        network=options.network,
        owner=options.owner,
    ) 