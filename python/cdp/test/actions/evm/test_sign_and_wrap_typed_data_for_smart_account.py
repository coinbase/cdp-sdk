"""Tests for sign_and_wrap_typed_data_for_smart_account module."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from cdp.actions.evm.sign_and_wrap_typed_data_for_smart_account import (
    SignAndWrapTypedDataForSmartAccountOptions,
    SignAndWrapTypedDataForSmartAccountResult,
    create_replay_safe_typed_data,
    create_smart_account_signature_wrapper,
    sign_and_wrap_typed_data_for_smart_account,
)
from cdp.api_clients import ApiClients


class TestSignAndWrapTypedDataForSmartAccount:
    """Test the sign_and_wrap_typed_data_for_smart_account function."""

    @pytest.fixture
    def mock_api_clients(self):
        """Create mock API clients."""
        api_clients = MagicMock(spec=ApiClients)
        api_clients.evm_accounts = MagicMock()
        return api_clients

    @pytest.fixture
    def mock_smart_account(self):
        """Create a mock smart account with owners."""
        smart_account = MagicMock()
        smart_account.address = "0x1234567890123456789012345678901234567890"

        # Create mock owners
        owner1 = MagicMock()
        owner1.address = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

        owner2 = MagicMock()
        owner2.address = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"

        smart_account.owners = [owner1, owner2]
        return smart_account

    @pytest.fixture
    def sample_typed_data(self):
        """Create sample EIP-712 typed data."""
        return {
            "domain": {
                "name": "Permit2",
                "chainId": 1,
                "verifyingContract": "0x000000000022D473030F116dDEE9F6B43aC78BA3",
            },
            "types": {
                "EIP712Domain": [
                    {"name": "name", "type": "string"},
                    {"name": "chainId", "type": "uint256"},
                    {"name": "verifyingContract", "type": "address"},
                ],
                "PermitTransferFrom": [
                    {"name": "permitted", "type": "TokenPermissions"},
                    {"name": "spender", "type": "address"},
                    {"name": "nonce", "type": "uint256"},
                    {"name": "deadline", "type": "uint256"},
                ],
                "TokenPermissions": [
                    {"name": "token", "type": "address"},
                    {"name": "amount", "type": "uint256"},
                ],
            },
            "primaryType": "PermitTransferFrom",
            "message": {
                "permitted": {
                    "token": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                    "amount": "1000000",
                },
                "spender": "0xFfFfFfFFfFFfFFfFFfFFFFFffFFFffffFfFFFfFf",
                "nonce": "0",
                "deadline": "1717123200",
            },
        }

    @pytest.mark.asyncio
    async def test_sign_and_wrap_typed_data_success(
        self, mock_api_clients, mock_smart_account, sample_typed_data
    ):
        """Test successful signing and wrapping of typed data."""
        # Mock the sign response
        mock_sign_response = MagicMock()
        mock_sign_response.signature = "0x" + "a" * 130  # 65 bytes (r + s + v) in hex
        mock_api_clients.evm_accounts.sign_evm_typed_data = AsyncMock(
            return_value=mock_sign_response
        )

        options = SignAndWrapTypedDataForSmartAccountOptions(
            smart_account=mock_smart_account,
            chain_id=1,
            typed_data=sample_typed_data,
            owner_index=0,
            idempotency_key="test-key",
        )

        result = await sign_and_wrap_typed_data_for_smart_account(mock_api_clients, options)

        # Verify result
        assert isinstance(result, SignAndWrapTypedDataForSmartAccountResult)
        assert result.signature.startswith("0x")
        assert len(result.signature) > 130  # Wrapped signature is longer than raw signature

        # Verify API call
        mock_api_clients.evm_accounts.sign_evm_typed_data.assert_called_once()
        call_args = mock_api_clients.evm_accounts.sign_evm_typed_data.call_args
        assert call_args.kwargs["address"] == "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        assert call_args.kwargs["x_idempotency_key"] == "test-key"

        # Verify the replay-safe typed data was created
        eip712_message = call_args.kwargs["eip712_message"]
        assert eip712_message.domain.name == "Coinbase Smart Wallet"
        assert eip712_message.domain.version == "1"
        assert eip712_message.domain.chain_id == 1
        assert eip712_message.domain.verifying_contract == mock_smart_account.address
        assert eip712_message.primary_type == "CoinbaseSmartWalletMessage"

    @pytest.mark.asyncio
    async def test_sign_and_wrap_typed_data_with_different_owner_index(
        self, mock_api_clients, mock_smart_account, sample_typed_data
    ):
        """Test signing with a different owner index."""
        mock_sign_response = MagicMock()
        mock_sign_response.signature = "0x" + "b" * 130
        mock_api_clients.evm_accounts.sign_evm_typed_data = AsyncMock(
            return_value=mock_sign_response
        )

        options = SignAndWrapTypedDataForSmartAccountOptions(
            smart_account=mock_smart_account,
            chain_id=1,
            typed_data=sample_typed_data,
            owner_index=1,  # Use second owner
        )

        _ = await sign_and_wrap_typed_data_for_smart_account(mock_api_clients, options)

        # Verify the second owner was used
        call_args = mock_api_clients.evm_accounts.sign_evm_typed_data.call_args
        assert call_args.kwargs["address"] == "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"

    @pytest.mark.asyncio
    async def test_sign_and_wrap_typed_data_no_owners(self, mock_api_clients, sample_typed_data):
        """Test error when smart account has no owners."""
        smart_account_no_owners = MagicMock()
        smart_account_no_owners.address = "0x1234567890123456789012345678901234567890"
        smart_account_no_owners.owners = []

        options = SignAndWrapTypedDataForSmartAccountOptions(
            smart_account=smart_account_no_owners,
            chain_id=1,
            typed_data=sample_typed_data,
        )

        with pytest.raises(ValueError, match="Smart account must have owners"):
            await sign_and_wrap_typed_data_for_smart_account(mock_api_clients, options)

    @pytest.mark.asyncio
    async def test_sign_and_wrap_typed_data_invalid_owner_index(
        self, mock_api_clients, mock_smart_account, sample_typed_data
    ):
        """Test error when owner index is out of range."""
        options = SignAndWrapTypedDataForSmartAccountOptions(
            smart_account=mock_smart_account,
            chain_id=1,
            typed_data=sample_typed_data,
            owner_index=5,  # Only 2 owners
        )

        with pytest.raises(ValueError, match="Owner index 5 out of range"):
            await sign_and_wrap_typed_data_for_smart_account(mock_api_clients, options)

    @pytest.mark.asyncio
    async def test_sign_and_wrap_typed_data_no_idempotency_key(
        self, mock_api_clients, mock_smart_account, sample_typed_data
    ):
        """Test signing without idempotency key."""
        mock_sign_response = MagicMock()
        mock_sign_response.signature = "0x" + "c" * 130
        mock_api_clients.evm_accounts.sign_evm_typed_data = AsyncMock(
            return_value=mock_sign_response
        )

        options = SignAndWrapTypedDataForSmartAccountOptions(
            smart_account=mock_smart_account,
            chain_id=1,
            typed_data=sample_typed_data,
            # No idempotency_key
        )

        _ = await sign_and_wrap_typed_data_for_smart_account(mock_api_clients, options)

        # Verify idempotency key was None
        call_args = mock_api_clients.evm_accounts.sign_evm_typed_data.call_args
        assert call_args.kwargs["x_idempotency_key"] is None


class TestCreateReplaySafeTypedData:
    """Test the create_replay_safe_typed_data function."""

    def test_create_replay_safe_typed_data(self):
        """Test creating replay-safe typed data."""
        original_typed_data = {
            "domain": {
                "name": "TestDApp",
                "version": "1",
                "chainId": 1,
                "verifyingContract": "0x5555555555555555555555555555555555555555",
            },
            "types": {
                "EIP712Domain": [
                    {"name": "name", "type": "string"},
                    {"name": "version", "type": "string"},
                    {"name": "chainId", "type": "uint256"},
                    {"name": "verifyingContract", "type": "address"},
                ],
                "TestMessage": [
                    {"name": "value", "type": "uint256"},
                    {"name": "recipient", "type": "address"},
                ],
            },
            "primaryType": "TestMessage",
            "message": {
                "value": "1000000000000000000",
                "recipient": "0x6666666666666666666666666666666666666666",
            },
        }

        smart_account_address = "0x1234567890123456789012345678901234567890"
        chain_id = 1

        result = create_replay_safe_typed_data(
            typed_data=original_typed_data,
            chain_id=chain_id,
            smart_account_address=smart_account_address,
        )

        # Verify the structure
        assert result["domain"]["name"] == "Coinbase Smart Wallet"
        assert result["domain"]["version"] == "1"
        assert result["domain"]["chainId"] == chain_id
        assert result["domain"]["verifyingContract"] == "0x1234567890123456789012345678901234567890"

        assert result["primaryType"] == "CoinbaseSmartWalletMessage"
        assert "CoinbaseSmartWalletMessage" in result["types"]
        assert result["types"]["CoinbaseSmartWalletMessage"] == [
            {"name": "hash", "type": "bytes32"}
        ]

        # Verify hash is included and formatted correctly
        assert "hash" in result["message"]
        assert result["message"]["hash"].startswith("0x")
        assert len(result["message"]["hash"]) == 66  # 0x + 64 hex chars

    def test_create_replay_safe_typed_data_different_chain(self):
        """Test replay-safe typed data with different chain ID."""
        typed_data = {
            "domain": {"name": "Test", "chainId": 5},
            "types": {
                "EIP712Domain": [
                    {"name": "name", "type": "string"},
                    {"name": "chainId", "type": "uint256"},
                ],
                "Message": [{"name": "data", "type": "string"}],
            },
            "primaryType": "Message",
            "message": {"data": "Hello"},
        }

        result = create_replay_safe_typed_data(
            typed_data=typed_data,
            chain_id=137,  # Polygon
            smart_account_address="0xabcdef1234567890abcdef1234567890abcdef12",
        )

        assert result["domain"]["chainId"] == 137


class TestCreateSmartAccountSignatureWrapper:
    """Test the create_smart_account_signature_wrapper function."""

    def test_create_signature_wrapper_with_0x_prefix(self):
        """Test creating signature wrapper with 0x prefix."""
        # 65-byte signature: 32 bytes r + 32 bytes s + 1 byte v
        signature_hex = "0x" + "aa" * 32 + "bb" * 32 + "1b"  # v = 27
        owner_index = 0

        result = create_smart_account_signature_wrapper(signature_hex, owner_index)

        # Verify result format
        assert result.startswith("0x")
        # The result should be longer than the original signature due to wrapping
        assert len(result) > len(signature_hex)

    def test_create_signature_wrapper_without_0x_prefix(self):
        """Test creating signature wrapper without 0x prefix."""
        signature_hex = "cc" * 32 + "dd" * 32 + "1c"  # v = 28
        owner_index = 1

        result = create_smart_account_signature_wrapper(signature_hex, owner_index)

        assert result.startswith("0x")

    def test_create_signature_wrapper_different_owner_indices(self):
        """Test that different owner indices produce different wrappers."""
        signature_hex = "0x" + "ee" * 32 + "ff" * 32 + "1b"

        wrapper0 = create_smart_account_signature_wrapper(signature_hex, 0)
        wrapper1 = create_smart_account_signature_wrapper(signature_hex, 1)
        wrapper2 = create_smart_account_signature_wrapper(signature_hex, 2)

        # All should be different due to different owner indices
        assert wrapper0 != wrapper1
        assert wrapper1 != wrapper2
        assert wrapper0 != wrapper2

    def test_create_signature_wrapper_v_values(self):
        """Test handling different v values (27, 28)."""
        r_s = "11" * 32 + "22" * 32

        # Test v = 27 (0x1b)
        sig_v27 = "0x" + r_s + "1b"
        wrapper_v27 = create_smart_account_signature_wrapper(sig_v27, 0)

        # Test v = 28 (0x1c)
        sig_v28 = "0x" + r_s + "1c"
        wrapper_v28 = create_smart_account_signature_wrapper(sig_v28, 0)

        # Different v values should produce different wrappers
        assert wrapper_v27 != wrapper_v28

    def test_create_signature_wrapper_max_owner_index(self):
        """Test with maximum uint8 owner index."""
        signature_hex = "0x" + "33" * 32 + "44" * 32 + "1b"
        owner_index = 255  # Max uint8

        result = create_smart_account_signature_wrapper(signature_hex, owner_index)

        # Should not raise an error
        assert result.startswith("0x")
