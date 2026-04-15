import json
from typing import Any

from eth_account.datastructures import SignedMessage, SignedTransaction
from eth_account.messages import SignableMessage, _hash_eip191_message, encode_typed_data
from eth_account.signers.base import BaseAccount
from eth_account.typed_transactions import TypedTransaction
from eth_account.types import TransactionDictType
from eth_typing import Hash32
from hexbytes import HexBytes
from web3 import Web3

from cdp.analytics import track_action, track_error
from cdp.auth.clients.urllib3 import Urllib3AuthClient, Urllib3AuthClientOptions
from cdp.errors import UserInputValidationError
from cdp.evm_server_account import EvmServerAccount
from cdp.openapi_client.constants import ERROR_DOCS_PAGE_URL
from cdp.openapi_client.errors import ApiError, HttpErrorType, is_openapi_error


class _EvmServerAccountSync:
    """Sync signing client used only by EvmLocalAccount.

    Makes synchronous HTTP calls to the CDP signing endpoints via urllib3,
    bypassing the async openapi_client entirely.
    """

    def __init__(self, address: str, http_client: Urllib3AuthClient) -> None:
        self._address = address
        self._http = http_client

    def _request(self, path: str, body: dict) -> dict:
        response = self._http.request("POST", path, body=body)
        data = json.loads(response.data)
        if response.status < 200 or response.status >= 300:
            if is_openapi_error(data):
                raise ApiError(
                    http_code=response.status,
                    error_type=data["errorType"],
                    error_message=data["errorMessage"],
                    correlation_id=data.get("correlationId"),
                    error_link=data.get(
                        "errorLink",
                        f"{ERROR_DOCS_PAGE_URL}#{data['errorType'].lower()}",
                    ),
                )
            raise ApiError(
                http_code=response.status,
                error_type=HttpErrorType.UNEXPECTED_ERROR,
                error_message=f"An unexpected error occurred: {data}",
                error_link=ERROR_DOCS_PAGE_URL,
            )
        return data

    def unsafe_sign_hash(self, message_hash: Hash32) -> SignedMessage:
        """Sign a message hash synchronously."""
        track_action(action="sign", account_type="evm_local")
        try:
            hash_hex = HexBytes(message_hash).hex()
            data = self._request(
                f"v2/evm/accounts/{self._address}/sign",
                {"hash": hash_hex},
            )
            signature_bytes = HexBytes(data["signature"])
            r = int.from_bytes(signature_bytes[0:32], byteorder="big")
            s = int.from_bytes(signature_bytes[32:64], byteorder="big")
            v = signature_bytes[64]
            return SignedMessage(
                message_hash=message_hash,
                r=r,
                s=s,
                v=v,
                signature=signature_bytes,
            )
        except Exception as error:
            track_error(error, "unsafe_sign_hash")
            raise

    def sign_message(self, signable_message: SignableMessage) -> SignedMessage:
        """Sign an EIP-191 message synchronously."""
        track_action(action="sign_message", account_type="evm_local")
        try:
            message_body = signable_message.body
            message_hex = (
                message_body.hex()
                if isinstance(message_body, bytes)
                else HexBytes(message_body).hex()
            )
            data = self._request(
                f"v2/evm/accounts/{self._address}/sign/message",
                {"message": message_hex},
            )
            message_hash = _hash_eip191_message(signable_message)
            signature_bytes = HexBytes(data["signature"])
            r = int.from_bytes(signature_bytes[0:32], byteorder="big")
            s = int.from_bytes(signature_bytes[32:64], byteorder="big")
            v = signature_bytes[64]
            return SignedMessage(
                message_hash=message_hash,
                r=r,
                s=s,
                v=v,
                signature=signature_bytes,
            )
        except Exception as error:
            track_error(error, "sign_message")
            raise

    def sign_transaction(self, transaction_dict: TransactionDictType) -> SignedTransaction:
        """Sign a transaction dict synchronously."""
        track_action(action="sign_transaction", account_type="evm_local")
        try:
            typed_tx = TypedTransaction.from_dict(transaction_dict)
            typed_tx.transaction.dictionary["v"] = 0
            typed_tx.transaction.dictionary["r"] = 0
            typed_tx.transaction.dictionary["s"] = 0
            payload = typed_tx.transaction.payload()
            serialized_tx = bytes([typed_tx.transaction_type]) + payload

            data = self._request(
                f"v2/evm/accounts/{self._address}/sign/transaction",
                {"transaction": "0x" + serialized_tx.hex()},
            )
            signed_tx_bytes = HexBytes(data["signedTransaction"])
            transaction_hash = Web3.keccak(signed_tx_bytes)
            signature_bytes = signed_tx_bytes
            r = int.from_bytes(signature_bytes[0:32], byteorder="big")
            s = int.from_bytes(signature_bytes[32:64], byteorder="big")
            v = signature_bytes[64]
            return SignedTransaction(
                raw_transaction=signed_tx_bytes,
                hash=transaction_hash,
                r=r,
                s=s,
                v=v,
            )
        except Exception as error:
            track_error(error, "sign_transaction")
            raise


class EvmLocalAccount(BaseAccount):
    """A class compatible with eth_account's LocalAccount.

    This class wraps an EvmServerAccount and provides a LocalAccount interface.
    It may be used to sign transactions and messages for an EVM server account.

    Args:
        server_account (EvmServerAccount): The EVM server account to sign transactions and messages for.

    """

    def __init__(self, server_account: EvmServerAccount):
        """Initialize the EvmLocalAccount class.

        Args:
            server_account (EvmServerAccount): The EVM server account to sign transactions and messages for.

        """
        cdp_client = server_account.api_clients._cdp_client
        # EvmLocalAccount exposes a synchronous interface (required by eth_account's BaseAccount).
        # To avoid bridging sync→async (which requires nest_asyncio and breaks on Python 3.12+),
        # we use a dedicated synchronous HTTP client (urllib3) for signing requests instead of
        # reusing the async aiohttp client used by EvmServerAccount.
        http_client = Urllib3AuthClient(
            options=Urllib3AuthClientOptions(
                api_key_id=cdp_client.api_key_id,
                api_key_secret=cdp_client.api_key_secret,
                wallet_secret=cdp_client.wallet_secret,
                source=cdp_client.source,
                source_version=cdp_client.source_version,
            ),
            base_url=cdp_client.configuration.host,
        )
        self._address = server_account.address
        self._sync_account = _EvmServerAccountSync(self._address, http_client)

    @property
    def address(self) -> str:
        """Get the address of the EVM server account.

        Returns:
            str: The address of the EVM server account.

        """
        return self._address

    def unsafe_sign_hash(self, message_hash: Hash32) -> SignedMessage:
        """Sign a message hash.

        WARNING: Never sign a hash that you didn't generate,
        it can be an arbitrary transaction.

        Args:
            message_hash (Hash32): The 32-byte message hash to sign.

        Returns:
            SignedMessage: The signed message.

        """
        return self._sync_account.unsafe_sign_hash(message_hash)

    def sign_message(self, signable_message: SignableMessage) -> SignedMessage:
        """Sign a message.

        Args:
            signable_message (SignableMessage): The message to sign.

        Returns:
            SignedMessage: The signed message.

        """
        return self._sync_account.sign_message(signable_message)

    def sign_transaction(self, transaction_dict: TransactionDictType) -> SignedTransaction:
        """Sign a transaction.

        Args:
            transaction_dict (TransactionDictType): The transaction to sign.

        Returns:
            SignedTransaction: The signed transaction.

        """
        return self._sync_account.sign_transaction(transaction_dict)

    def sign_typed_data(
        self,
        domain_data: dict[str, Any] | None = None,
        message_types: dict[str, Any] | None = None,
        message_data: dict[str, Any] | None = None,
        full_message: dict[str, Any] | None = None,
    ) -> SignedMessage:
        """Sign typed data.

        Either provide a full message, or provide the domain data, message types, and message data.

        Args:
            domain_data (dict[str, Any], optional): The domain data. Defaults to None.
            message_types (dict[str, Any], optional): The message types. Defaults to None.
            message_data (dict[str, Any], optional): The message data. Defaults to None.
            full_message (dict[str, Any], optional): The full message. Defaults to None.

        Returns:
            SignedMessage: The signed message.

        Raises:
            UserInputValidationError: If neither full_message nor both message_types and message_data are provided.
            ValueError: If the primaryType cannot be inferred from message_types.

        """
        track_action(action="sign_typed_data", account_type="evm_local")
        if full_message is not None:
            typed_data = full_message
        elif message_types is not None and message_data is not None:
            primary_types = list(message_types.keys() - {"EIP712Domain"})
            if not primary_types:
                raise ValueError("Could not infer primaryType from message_types")
            typed_data = {
                "domain": domain_data,
                "types": message_types,
                "primaryType": primary_types[0],
                "message": message_data,
            }
        else:
            raise UserInputValidationError(
                "Must provide either full_message or both message_types and message_data"
            )

        # Include the EIP712Domain type in the types if not already present
        typed_data["domain"] = typed_data.get("domain", {})
        eip712_domain_type = self._get_types_for_eip712_domain(typed_data["domain"])
        typed_data["types"] = {
            "EIP712Domain": eip712_domain_type,
            **typed_data["types"],
        }

        # Process the message to handle bytes32 types properly
        typed_data["message"] = self._process_message_bytes(
            message=typed_data["message"],
            types=typed_data["types"],
            type_key=typed_data["primaryType"],
        )

        # https://github.com/ethereum/eth-account/blob/main/eth_account/account.py#L1047
        signable_message = encode_typed_data(full_message=typed_data)
        message_hash = _hash_eip191_message(signable_message)

        return self._sync_account.unsafe_sign_hash(message_hash)

    def _get_types_for_eip712_domain(
        self, domain: dict[str, Any] | None = None
    ) -> list[dict[str, str]]:
        """Get types for EIP712Domain based on the domain properties that are present.

        This function dynamically generates the EIP712Domain type definition based on
        which domain properties are provided.

        Args:
            domain: The domain data dictionary

        Returns:
            List of field definitions for EIP712Domain type

        """
        types = []

        if domain is None:
            return types

        if isinstance(domain.get("name"), str):
            types.append({"name": "name", "type": "string"})

        if domain.get("version"):
            types.append({"name": "version", "type": "string"})

        if isinstance(domain.get("chainId"), int):
            types.append({"name": "chainId", "type": "uint256"})

        if domain.get("verifyingContract"):
            types.append({"name": "verifyingContract", "type": "address"})

        if domain.get("salt"):
            types.append({"name": "salt", "type": "bytes32"})

        return types

    def _process_message_bytes(
        self,
        message: dict[str, Any],
        types: dict[str, Any],
        type_key: str,
    ) -> dict[str, Any]:
        """Process message data to handle bytes32 types properly.

        Args:
            message: The message data
            types: The type definitions
            type_key: The key of the type to process

        Returns:
            The processed message with bytes32 values properly encoded

        """

        def _find_field_type(field_name: str, fields: list) -> str | None:
            for field in fields:
                if field["name"] == field_name:
                    return field["type"]
            return None

        type_fields = types[type_key]
        processed_message = {}

        for key, value in message.items():
            processed_message[key] = value
            if isinstance(value, dict):
                # Handle nested objects by recursively processing them
                value_type = _find_field_type(key, type_fields)
                if value_type:
                    processed_message[key] = self._process_message_bytes(value, types, value_type)
            elif isinstance(value, bytes) and _find_field_type(key, type_fields) == "bytes32":
                # Handle bytes32 values so our internal sign typed data can serialize them properly
                value_str = value.hex()
                processed_message[key] = (
                    "0x" + value_str if not value_str.startswith("0x") else value_str
                )

        return processed_message

    def __str__(self) -> str:
        """Return a string representation of the EthereumAccount object.

        Returns:
            str: A string representation of the EthereumAccount.

        """
        return f"Ethereum Account Address: {self.address}"

    def __repr__(self) -> str:
        """Return a string representation of the EthereumAccount object.

        Returns:
            str: A string representation of the EthereumAccount.

        """
        return str(self)
