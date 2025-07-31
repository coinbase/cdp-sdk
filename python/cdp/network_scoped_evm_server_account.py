"""Functions to convert existing EVM server accounts to network-scoped versions."""

from collections.abc import Callable
from typing import Any, Literal

from web3 import Web3

from cdp.actions.evm.swap import AccountSwapOptions
from cdp.evm_server_account import EvmServerAccount
from cdp.network_capabilities import is_method_supported_on_network


class NetworkScopedEvmServerAccount:
    """A network-scoped EVM server account that only exposes methods supported by the network.

    Uses dynamic attribute access to match the TypeScript approach.
    Accepts either a network name or an RPC URL for the 'network' parameter. If an RPC URL is provided, it is used as the custom endpoint and network is set to 'custom'.
    """

    def __init__(
        self,
        evm_server_account: EvmServerAccount,
        network: str | None = None,
        rpc_url: str | None = None,
    ):
        # If network looks like an RPC URL, treat it as such
        if network and isinstance(network, str) and network.strip().lower().startswith("http"):
            self._rpc_url = network
            self._network = "custom"
        else:
            self._network = network
            self._rpc_url = rpc_url
        self._evm_server_account = evm_server_account
        self._should_use_api_for_sends = self._network in [
            "base",
            "base-sepolia",
            "ethereum",
            "ethereum-sepolia",
        ]
        self._web3 = None
        if self._rpc_url and not self._should_use_api_for_sends:
            self._web3 = Web3(Web3.HTTPProvider(self._rpc_url))
        self._supported_methods: dict[str, Callable] = {}
        self._init_supported_methods()

    def _init_supported_methods(self):
        # Always include base methods
        self._supported_methods["send_transaction"] = self._network_scoped_send_transaction
        self._supported_methods["transfer"] = self._network_scoped_transfer
        self._supported_methods["wait_for_transaction_receipt"] = (
            self._network_scoped_wait_for_transaction_receipt
        )
        # Conditionally add network-specific methods
        if is_method_supported_on_network("list_token_balances", self._network):
            self._supported_methods["list_token_balances"] = (
                self._network_scoped_list_token_balances
            )
        if is_method_supported_on_network("request_faucet", self._network):
            self._supported_methods["request_faucet"] = self._network_scoped_request_faucet
        if is_method_supported_on_network("quote_fund", self._network):
            self._supported_methods["quote_fund"] = self._network_scoped_quote_fund
        if is_method_supported_on_network("fund", self._network):
            self._supported_methods["fund"] = self._network_scoped_fund
            self._supported_methods["wait_for_fund_operation_receipt"] = (
                self._network_scoped_wait_for_fund_operation_receipt
            )
        if is_method_supported_on_network("quote_swap", self._network):
            self._supported_methods["quote_swap"] = self._network_scoped_quote_swap
        if is_method_supported_on_network("swap", self._network):
            self._supported_methods["swap"] = self._network_scoped_swap

    def __getattr__(self, name: str) -> Any:
        """Dynamically access supported methods and account properties, or raise AttributeError if not found."""
        if name in self._supported_methods:
            return self._supported_methods[name]
        # Expose account properties
        if name == "network":
            return self._network
        if name == "rpc_url":
            return self._rpc_url
        if name == "address":
            return self._evm_server_account.address
        if name == "name":
            return getattr(self._evm_server_account, "name", None)
        if name == "type":
            return "evm-server"
        if name == "policies":
            return getattr(self._evm_server_account, "policies", None)
        # Expose signing methods
        if name == "sign":
            return getattr(self._evm_server_account, "sign", None)
        if name == "sign_message":
            return getattr(self._evm_server_account, "sign_message", None)
        if name == "sign_transaction":
            return getattr(self._evm_server_account, "sign_transaction", None)
        if name == "sign_typed_data":
            return getattr(self._evm_server_account, "sign_typed_data", None)
        raise AttributeError(f"'{type(self).__name__}' object has no attribute '{name}'")

    async def _network_scoped_send_transaction(
        self,
        transaction: str | dict[str, Any],
        idempotency_key: str | None = None,
    ) -> str:
        """Send a transaction using the API for managed networks, or directly via web3.py for custom RPC on non-managed networks.

        Only support sending raw signed tx hex string for custom RPC. Do not handle private key signing here.
        """
        if self._web3:
            if isinstance(transaction, str):
                # If transaction is a raw signed tx hex string
                tx_hash = self._web3.eth.send_raw_transaction(transaction)
                return self._web3.toHex(tx_hash)
            else:
                raise NotImplementedError(
                    "For custom RPC sends, provide a raw signed transaction hex string."
                )
        else:
            return await self._evm_server_account.send_transaction(
                transaction=transaction,
                network=self._network,
                idempotency_key=idempotency_key,
            )

    async def _network_scoped_transfer(
        self,
        to: str,
        amount: int,
        token: str,
    ) -> str:
        """Transfer using the API for managed networks, or via web3.py for custom RPC."""
        if self._web3:
            # Ensure the account is unlocked in web3.py
            from_address = self._evm_server_account.address
            w3 = self._web3
            if token.lower() == "eth":
                tx = {
                    "from": from_address,
                    "to": to,
                    "value": amount,
                    "gas": 21000,
                    "nonce": w3.eth.get_transaction_count(from_address),
                }
                try:
                    tx_hash = w3.eth.send_transaction(tx)
                except ValueError as e:
                    raise Exception(f"Failed to send ETH transfer: {e}") from e
                return w3.toHex(tx_hash)
            else:
                # ERC20 transfer: approve and transfer
                erc20_address = _get_erc20_address(token, self._network)
                contract = w3.eth.contract(address=erc20_address, abi=_ERC20_ABI)
                nonce = w3.eth.get_transaction_count(from_address)
                # Approve
                try:
                    approve_tx = contract.functions.approve(to, amount).build_transaction(
                        {
                            "from": from_address,
                            "nonce": nonce,
                            "gas": 100000,
                        }
                    )
                    approve_hash = w3.eth.send_transaction(approve_tx)
                    w3.eth.wait_for_transaction_receipt(approve_hash)
                except Exception as e:
                    raise Exception(f"Failed to approve ERC20 transfer: {e}") from e
                # Transfer
                try:
                    transfer_tx = contract.functions.transfer(to, amount).build_transaction(
                        {
                            "from": from_address,
                            "nonce": nonce + 1,
                            "gas": 100000,
                        }
                    )
                    transfer_hash = w3.eth.send_transaction(transfer_tx)
                except Exception as e:
                    raise Exception(f"Failed to send ERC20 transfer: {e}") from e
                return w3.toHex(transfer_hash)
        # Default: managed network (API)
        return await self._evm_server_account.transfer(
            to=to,
            amount=amount,
            token=token,
            network=self._network,
        )

    async def _network_scoped_wait_for_transaction_receipt(
        self,
        transaction_hash: str,
        timeout_seconds: float = 20,
        interval_seconds: float = 0.2,
        rpc_url: str | None = None,
    ) -> dict:
        """Wait for transaction receipt using web3.py if custom RPC is set, otherwise use the API."""
        # If we have a custom RPC URL, use web3.py
        if self._rpc_url:
            if not self._web3:
                # Initialize web3 if not already done
                self._web3 = Web3(Web3.HTTPProvider(self._rpc_url))

            import asyncio
            from time import time

            from web3.exceptions import TransactionNotFound

            start = time()
            while True:
                try:
                    receipt = self._web3.eth.get_transaction_receipt(transaction_hash)
                    if receipt:
                        return dict(receipt)
                except TransactionNotFound:
                    # Transaction not found yet, continue waiting
                    pass

                if time() - start > timeout_seconds:
                    raise TimeoutError("Timeout waiting for transaction receipt via custom RPC.")
                await asyncio.sleep(interval_seconds)
        else:
            # For managed networks, use default RPC URLs
            # Since EvmServerAccount doesn't have a wait_for_transaction_receipt method
            # We'll use web3.py directly with the network's default RPC
            default_rpc_urls = {
                "base": "https://mainnet.base.org",
                "base-sepolia": "https://sepolia.base.org",
                "ethereum": "https://eth.llamarpc.com",
                "ethereum-sepolia": "https://rpc.sepolia.org",
            }

            network_rpc_url = default_rpc_urls.get(self._network)
            if not network_rpc_url:
                raise NotImplementedError(
                    f"wait_for_transaction_receipt is not supported for network '{self._network}'. "
                    "Please use web3.py directly or provide a custom RPC URL."
                )

            web3 = Web3(Web3.HTTPProvider(network_rpc_url))

            import asyncio
            from time import time

            from web3.exceptions import TransactionNotFound

            start = time()
            while True:
                try:
                    receipt = web3.eth.get_transaction_receipt(transaction_hash)
                    if receipt:
                        return dict(receipt)
                except TransactionNotFound:
                    # Transaction not found yet, continue waiting
                    pass

                if time() - start > timeout_seconds:
                    raise TimeoutError("Timeout waiting for transaction receipt.")
                await asyncio.sleep(interval_seconds)

    async def _network_scoped_list_token_balances(
        self,
        page_size: int | None = None,
        page_token: str | None = None,
    ):
        return await self._evm_server_account.list_token_balances(
            network=self._network,
            page_size=page_size,
            page_token=page_token,
        )

    async def _network_scoped_request_faucet(
        self,
        token: str,
    ) -> str:
        return await self._evm_server_account.request_faucet(
            network=self._network,
            token=token,
        )

    async def _network_scoped_quote_fund(
        self,
        amount: int,
        token: Literal["eth", "usdc"],
    ):
        return await self._evm_server_account.quote_fund(
            network=self._network,
            amount=amount,
            token=token,
        )

    async def _network_scoped_fund(
        self,
        amount: int,
        token: Literal["eth", "usdc"],
    ):
        return await self._evm_server_account.fund(
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
        return await self._evm_server_account.wait_for_fund_operation_receipt(
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
        signer_address: str | None = None,
        idempotency_key: str | None = None,
    ):
        return await self._evm_server_account.quote_swap(
            from_token=from_token,
            to_token=to_token,
            from_amount=from_amount,
            network=self._network,
            slippage_bps=slippage_bps,
            signer_address=signer_address,
            idempotency_key=idempotency_key,
        )

    async def _network_scoped_swap(
        self,
        swap_options: AccountSwapOptions,
    ):
        if hasattr(swap_options, "network"):
            swap_options.network = self._network
        return await self._evm_server_account.swap(swap_options)


# Helper: Map known ERC20 tokens to contract addresses per network
_ERC20_ADDRESS_MAP = {
    "base": {"usdc": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"},
    "base-sepolia": {"usdc": "0x036CbD53842c5426634e7929541eC2318f3dCF7e"},
    # Add more networks/tokens as needed
}

# Minimal ERC20 ABI for approve/transfer
_ERC20_ABI = [
    {
        "constant": False,
        "inputs": [
            {"name": "_spender", "type": "address"},
            {"name": "_value", "type": "uint256"},
        ],
        "name": "approve",
        "outputs": [{"name": "", "type": "bool"}],
        "type": "function",
    },
    {
        "constant": False,
        "inputs": [
            {"name": "_to", "type": "address"},
            {"name": "_value", "type": "uint256"},
        ],
        "name": "transfer",
        "outputs": [{"name": "", "type": "bool"}],
        "type": "function",
    },
]


def _get_erc20_address(token: str, network: str) -> str:
    # If token is a contract address, return as is
    if token.startswith("0x") and len(token) == 42:
        return token
    return _ERC20_ADDRESS_MAP.get(network, {}).get(token, token)
