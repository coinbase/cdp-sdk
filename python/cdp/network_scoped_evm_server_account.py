"""Functions to convert existing EVM server accounts to network-scoped versions."""

from collections.abc import Callable
from typing import Any, Literal

from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware

from cdp.actions.evm.swap import AccountSwapOptions
from cdp.base_node_rpc_url import get_base_node_rpc_url
from cdp.evm_server_account import EvmServerAccount
from cdp.network_capabilities import is_method_supported_on_network
from cdp.network_config import get_network_name, resolve_chain_id_from_rpc_url


class NetworkScopedEvmServerAccount:
    """A network-scoped EVM server account that only exposes methods supported by the network.

    Uses dynamic attribute access to match the TypeScript approach.
    Accepts either a network name or an RPC URL for the 'network' parameter. If an RPC URL is provided, it is used as the custom endpoint and network is set to 'custom'.
    """

    def __init__(
        self,
        evm_server_account: EvmServerAccount,
        network: str | None = None,
    ):
        if network and isinstance(network, str) and network.strip().lower().startswith("http"):
            self._rpc_url = network
            self._network = get_network_name(resolve_chain_id_from_rpc_url(network))
        else:
            self._network = network
            self._rpc_url = None
        self._evm_server_account = evm_server_account
        # Networks that should use CDP API for sending (not just signing)
        self._should_use_api_for_sends = self._network in [
            "base",
            "base-sepolia",
            "ethereum",
            "ethereum-sepolia",
        ]
        self._web3 = None
        self._web3_account = None
        if self._rpc_url and not self._should_use_api_for_sends:
            self._web3 = Web3(Web3.HTTPProvider(self._rpc_url))
            if self._is_poa_network():
                self._web3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
        self._supported_methods: dict[str, Callable] = {}
        self._init_supported_methods()

    async def _setup_web3_for_remote_signing(self):
        """Set up web3 to work with CDP remote signing (no private key export needed)."""
        if self._web3:
            # Just set the default account to our CDP account address
            # We'll use CDP's remote signing instead of local signing
            self._web3.eth.default_account = self._evm_server_account.address
        return self._evm_server_account.address

    async def _send_transaction_with_remote_signing(self, transaction_dict: dict[str, Any]) -> str:
        filled_transaction = self._web3.eth.fill_transaction(transaction_dict)

        # Use CDP to sign the complete transaction remotely (secure!)
        signed_tx = await self._evm_server_account.sign_transaction(filled_transaction)

        # Submit the pre-signed transaction via our custom RPC
        tx_hash = self._web3.eth.send_transaction(signed_tx.raw_transaction)
        return self._web3.toHex(tx_hash)

    def _is_poa_network(self) -> bool:
        """Check if the network is a Proof of Authority network that needs PoA middleware."""
        # Check network name
        if self._network:
            network_lower = self._network.lower()
            if any(net in network_lower for net in ["polygon", "mumbai", "binance", "bsc"]):
                return True

        return False

    def _populate_eip1559_fee_fields(self, tx: dict[str, Any]) -> None:
        """Populate EIP-1559 fee fields and transaction type if missing."""
        if "maxPriorityFeePerGas" not in tx:
            tx["maxPriorityFeePerGas"] = self._web3.eth.max_priority_fee
        if "maxFeePerGas" not in tx:
            tx["maxFeePerGas"] = self._web3.eth.gas_price + tx["maxPriorityFeePerGas"]
        if "type" not in tx:
            tx["type"] = "0x2"

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

        For base and base-sepolia networks, always uses CDP API for sends regardless of RPC URL.
        For other networks, uses custom RPC if provided, otherwise falls back to CDP API.
        """
        if self._should_use_api_for_sends:
            tx_hash = await self._evm_server_account.send_transaction(
                transaction=transaction,
                network=self._network,
                idempotency_key=idempotency_key,
            )
            print(
                f"Transaction sent! Network: {self._network} RPC: {self._rpc_url or 'default'} Hash: {tx_hash}"
            )
            return tx_hash
        elif self._web3:
            await self._setup_web3_for_remote_signing()

            # Convert transaction to dictionary format
            if isinstance(transaction, str):
                raise ValueError(
                    "Raw transaction strings are not supported. Please provide transaction as a dictionary."
                )
            else:
                # For structured transaction objects, prepare for remote signing
                if hasattr(transaction, "as_dict"):
                    transaction_dict = transaction.as_dict()
                else:
                    transaction_dict = transaction

                # Add required fields for Web3
                transaction_dict["chainId"] = self._web3.eth.chain_id
                # Populate nonce if missing
                if "nonce" not in transaction_dict:
                    transaction_dict["nonce"] = self._web3.eth.get_transaction_count(
                        self._evm_server_account.address
                    )

                # Estimate gas if missing
                if "gas" not in transaction_dict:
                    transaction_dict["gas"] = self._web3.eth.estimate_gas(transaction_dict)

                # Populate EIP-1559 fee fields and type if missing
                self._populate_eip1559_fee_fields(transaction_dict)

                # Sign the transaction via CDP remote signer
                signed_tx = await self._evm_server_account.sign_transaction(transaction_dict)

                # Send the raw signed transaction via Web3
                tx_hash_bytes = self._web3.eth.send_raw_transaction(signed_tx.raw_transaction)
                tx_hash_hex = self._web3.toHex(tx_hash_bytes)
                print(
                    f"Transaction sent! Network: {self._network} RPC: {self._rpc_url or 'default'} Hash: {tx_hash_hex}"
                )
                return tx_hash_hex
        else:
            # Fallback to CDP API if no custom RPC is provided
            tx_hash = await self._evm_server_account.send_transaction(
                transaction=transaction,
                network=self._network,
                idempotency_key=idempotency_key,
            )
            print(
                f"Transaction sent! Network: {self._network} RPC: {self._rpc_url or 'default'} Hash: {tx_hash}"
            )
            return tx_hash

    async def _network_scoped_transfer(
        self,
        to: str,
        amount: int,
        token: str,
    ) -> str:
        """Transfer using the API for managed networks, or via web3.py for custom RPC.

        For base and base-sepolia networks, always uses CDP API for transfers regardless of RPC URL.
        For other networks, uses custom RPC if provided, otherwise falls back to CDP API.
        """
        if self._should_use_api_for_sends:
            # Use CDP API for transfers (base, base-sepolia, ethereum, ethereum-sepolia)
            tx_hash = await self._evm_server_account.transfer(
                to=to,
                amount=amount,
                token=token,
                network=self._network,
            )
            print(
                f"Transaction sent! Network: {self._network} RPC: {self._rpc_url or 'default'} Hash: {tx_hash}"
            )
            return tx_hash
        elif self._web3:
            await self._setup_web3_for_remote_signing()

            if token.lower() == "eth":
                tx = {
                    "to": to,
                    "value": amount,
                    "from": self._evm_server_account.address,
                }
                try:
                    # Populate nonce
                    if "nonce" not in tx:
                        tx["nonce"] = self._web3.eth.get_transaction_count(tx["from"])
                    # Estimate gas
                    if "gas" not in tx:
                        tx["gas"] = self._web3.eth.estimate_gas(tx)
                    # EIP-1559 fees
                    self._populate_eip1559_fee_fields(tx)

                    # Sign and send raw
                    signed_tx = await self._evm_server_account.sign_transaction(tx)
                    tx_hash_bytes = self._web3.eth.send_raw_transaction(signed_tx.raw_transaction)
                    tx_hash_hex = self._web3.toHex(tx_hash_bytes)
                    print(
                        f"Transaction sent! Network: {self._network} RPC: {self._rpc_url or 'default'} Hash: {tx_hash_hex}"
                    )
                    return tx_hash_hex
                except ValueError as e:
                    raise Exception(f"Failed to send ETH transfer: {e}") from e
            else:
                # ERC20 transfer: build transaction and sign remotely
                erc20_address = _get_erc20_address(token, self._network)
                contract = self._web3.eth.contract(address=erc20_address, abi=_ERC20_ABI)

                # Build transfer transaction (web3 will auto-populate gas, nonce, etc.)
                transfer_tx = contract.functions.transfer(to, amount).build_transaction(
                    {"from": self._evm_server_account.address}
                )
                try:
                    # Populate nonce
                    if "nonce" not in transfer_tx:
                        transfer_tx["nonce"] = self._web3.eth.get_transaction_count(
                            transfer_tx["from"]
                        )
                    # Estimate gas
                    if "gas" not in transfer_tx:
                        transfer_tx["gas"] = self._web3.eth.estimate_gas(transfer_tx)
                    # EIP-1559 fees
                    self._populate_eip1559_fee_fields(transfer_tx)

                    # Sign and send raw
                    signed_tx = await self._evm_server_account.sign_transaction(transfer_tx)
                    tx_hash_bytes = self._web3.eth.send_raw_transaction(signed_tx.raw_transaction)
                    transfer_hash_hex = self._web3.toHex(tx_hash_bytes)
                    print(
                        f"Transaction sent! Network: {self._network} RPC: {self._rpc_url or 'default'} Hash: {transfer_hash_hex}"
                    )
                    return transfer_hash_hex
                except ValueError as e:
                    raise Exception(f"Failed to send ERC20 transfer: {e}") from e
        else:
            # Fallback to CDP API if no custom RPC is provided
            tx_hash = await self._evm_server_account.transfer(
                to=to,
                amount=amount,
                token=token,
                network=self._network,
            )
            print(
                f"Transaction sent! Network: {self._network} RPC: {self._rpc_url or 'default'} Hash: {tx_hash}"
            )
            return tx_hash

    async def _network_scoped_wait_for_transaction_receipt(
        self,
        transaction_hash: str,
        timeout_seconds: float = 20,
        interval_seconds: float = 0.2,
        rpc_url: str | None = None,
    ) -> dict:
        """Wait for transaction receipt using web3.py's built-in wait_for_transaction_receipt method."""
        # If we have a custom RPC URL, use web3.py
        if self._rpc_url:
            if not self._web3:
                # Initialize web3 if not already done
                self._web3 = Web3(Web3.HTTPProvider(self._rpc_url))

            receipt = self._web3.eth.wait_for_transaction_receipt(
                transaction_hash, timeout=timeout_seconds, poll_latency=interval_seconds
            )
            return dict(receipt)
        else:
            # For managed networks, try to use Base Node RPC URL for base/base-sepolia
            network_rpc_url = None

            # Try to get Base Node RPC URL for base networks
            if self._network in ["base", "base-sepolia"]:
                try:
                    network_rpc_url = await get_base_node_rpc_url(
                        self._evm_server_account._EvmServerAccount__api_clients, self._network
                    )
                except Exception:
                    # If Base Node RPC URL fails, fall back to default
                    network_rpc_url = None

            # Fall back to default RPC URLs if Base Node URL is not available
            if not network_rpc_url:
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
            receipt = web3.eth.wait_for_transaction_receipt(
                transaction_hash, timeout=timeout_seconds, poll_latency=interval_seconds
            )
            return dict(receipt)

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
