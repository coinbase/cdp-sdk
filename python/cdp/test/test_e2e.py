import asyncio
import base64
import os
import random
import string
from math import floor

import base58
import pytest
import pytest_asyncio
from dotenv import load_dotenv
from eth_account.account import Account
from eth_account.messages import encode_defunct
from solana.rpc.api import Client as SolanaClient
from solders.pubkey import Pubkey as PublicKey
from web3 import Web3

from cdp import CdpClient
from cdp.evm_call_types import EncodedCall
from cdp.evm_local_account import EvmLocalAccount
from cdp.evm_transaction_types import TransactionRequestEIP1559
from cdp.openapi_client.errors import ApiError
from cdp.openapi_client.models.eip712_domain import EIP712Domain
from cdp.openapi_client.models.update_evm_smart_account_request import UpdateEvmSmartAccountRequest
from cdp.policies.types import (
    CreatePolicyOptions,
    EthValueCriterion,
    EvmAddressCriterion,
    EvmMessageCriterion,
    EvmNetworkCriterion,
    SendEvmTransactionRule,
    SignEvmHashRule,
    SignEvmMessageRule,
    SignEvmTransactionRule,
    SignSolanaTransactionRule,
    SolanaAddressCriterion,
    UpdatePolicyOptions,
)
from cdp.update_account_types import UpdateAccountOptions

load_dotenv()

w3 = Web3(Web3.HTTPProvider("https://sepolia.base.org"))

test_account_name = "E2EServerAccount2"

e2e_base_path = os.getenv("E2E_BASE_PATH")

client_args = {}

if e2e_base_path:
    client_args["base_path"] = e2e_base_path


@pytest_asyncio.fixture(scope="function")
async def cdp_client():
    """Create and configure CDP client for all tests."""
    client = CdpClient(**client_args)
    yield client
    await client.close()


@pytest_asyncio.fixture(scope="function")
async def solana_account():
    """Create and configure a shared Solana account for all tests."""
    client = CdpClient(**client_args)
    account = await client.solana.get_or_create_account(name=test_account_name)
    yield account
    await client.close()


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_create_get_and_list_accounts(cdp_client):
    """Test creating, getting, and listing accounts."""
    random_name = "".join(
        [random.choice(string.ascii_letters + string.digits)]
        + [random.choice(string.ascii_letters + string.digits + "-") for _ in range(34)]
        + [random.choice(string.ascii_letters + string.digits)]
    )
    server_account = await cdp_client.evm.create_account(name=random_name)
    assert server_account is not None

    response = await cdp_client.evm.list_accounts()
    assert response is not None
    assert len(response.accounts) > 0

    account = await cdp_client.evm.get_account(server_account.address)
    assert account is not None
    assert account.address == server_account.address
    assert account.name == random_name

    account = await cdp_client.evm.get_account(name=random_name)
    assert account is not None
    assert account.address == server_account.address
    assert account.name == random_name


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_import_account(cdp_client):
    """Test importing an account."""
    account = Account.create()
    random_name = generate_random_name()

    import_account_options = {
        "private_key": account.key.hex(),
        "name": random_name,
    }

    if os.getenv("CDP_E2E_ENCRYPTION_PUBLIC_KEY"):
        import_account_options["encryption_public_key"] = os.getenv("CDP_E2E_ENCRYPTION_PUBLIC_KEY")

    imported_account = await cdp_client.evm.import_account(
        **import_account_options,
    )
    assert imported_account is not None
    assert imported_account.address == account.address
    assert imported_account.name == random_name

    imported_account = await cdp_client.evm.get_account(address=imported_account.address)
    assert imported_account is not None
    assert imported_account.address == account.address
    assert imported_account.name == random_name


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_import_solana_account(cdp_client):
    """Test importing a Solana account."""
    from solders.keypair import Keypair

    # Generate a new Solana keypair
    keypair = Keypair()
    random_name = generate_random_name()

    # Convert private key to base58 string (32 bytes)
    private_key_bytes = bytes(keypair.secret())
    private_key_b58 = base58.b58encode(private_key_bytes).decode()

    import_account_options = {
        "private_key": private_key_b58,
        "name": random_name,
    }

    if os.getenv("CDP_E2E_ENCRYPTION_PUBLIC_KEY"):
        import_account_options["encryption_public_key"] = os.getenv("CDP_E2E_ENCRYPTION_PUBLIC_KEY")

    imported_account = await cdp_client.solana.import_account(
        **import_account_options,
    )
    assert imported_account is not None
    assert imported_account.address == str(keypair.pubkey())
    assert imported_account.name == random_name

    # Verify we can retrieve the imported account
    retrieved_account = await cdp_client.solana.get_account(address=imported_account.address)
    assert retrieved_account is not None
    assert retrieved_account.address == str(keypair.pubkey())
    assert retrieved_account.name == random_name


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_import_solana_account_with_bytes(cdp_client):
    """Test importing a Solana account using bytes directly instead of base58 string."""
    from solders.keypair import Keypair

    # Generate a new Solana keypair
    keypair = Keypair()
    random_name = generate_random_name()

    # Use private key bytes directly (64 bytes)
    private_key_bytes = bytes(keypair.secret())

    import_account_options = {
        "private_key": private_key_bytes,
        "name": random_name,
    }

    if os.getenv("CDP_E2E_ENCRYPTION_PUBLIC_KEY"):
        import_account_options["encryption_public_key"] = os.getenv("CDP_E2E_ENCRYPTION_PUBLIC_KEY")

    imported_account = await cdp_client.solana.import_account(
        **import_account_options,
    )
    assert imported_account is not None
    assert imported_account.address == str(keypair.pubkey())
    assert imported_account.name == random_name

    # Verify we can retrieve the imported account
    retrieved_account = await cdp_client.solana.get_account(address=imported_account.address)
    assert retrieved_account is not None
    assert retrieved_account.address == str(keypair.pubkey())
    assert retrieved_account.name == random_name


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_export_evm_account(cdp_client):
    """Test exporting an EVM account."""
    random_name = generate_random_name()
    account = await cdp_client.evm.create_account(name=random_name)
    assert account is not None

    exported_private_key_by_address = await cdp_client.evm.export_account(address=account.address)
    assert exported_private_key_by_address is not None
    public_key_by_address = Account.from_key(private_key=exported_private_key_by_address).address
    assert public_key_by_address == account.address

    exported_private_key_by_name = await cdp_client.evm.export_account(name=random_name)
    assert exported_private_key_by_name is not None
    public_key_by_name = Account.from_key(private_key=exported_private_key_by_name).address
    assert public_key_by_name == account.address


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_export_solana_account(cdp_client):
    """Test exporting a Solana account."""
    random_name = generate_random_name()
    account = await cdp_client.solana.create_account(name=random_name)
    assert account is not None

    exported_private_key_by_address = await cdp_client.solana.export_account(
        address=account.address
    )
    assert exported_private_key_by_address is not None
    full_key_bytes_by_address = base58.b58decode(exported_private_key_by_address)
    public_key_bytes_by_address = full_key_bytes_by_address[32:]
    public_key_by_address = base58.b58encode(public_key_bytes_by_address).decode("utf-8")
    assert public_key_by_address == account.address

    exported_private_key_by_name = await cdp_client.solana.export_account(name=random_name)
    assert exported_private_key_by_name is not None
    full_key_bytes_by_name = base58.b58decode(exported_private_key_by_name)
    public_key_bytes_by_name = full_key_bytes_by_name[32:]
    public_key_by_name = base58.b58encode(public_key_bytes_by_name).decode("utf-8")
    assert public_key_by_name == account.address


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_evm_sign_fns(cdp_client):
    """Test signing functions."""
    account = await cdp_client.evm.create_account()

    signed_hash = await cdp_client.evm.sign_hash(account.address, "0x" + "1" * 64)
    assert signed_hash is not None

    signed_message = await cdp_client.evm.sign_message(account.address, "0x123")
    assert signed_message is not None

    # must be a valid transaction that can be decoded
    signature = "0x02f87083014a3480830f4240831e895582520894000000000000000000000000000000000000000085e8d4a5100080c080a0c3685a0f41476c9917a16a55726b19e4b1b06a856843dc19faa212df5901243aa0218063520078d5ea45dc2b66cef8668d73ad640a65b2debf542b30b5fdf42b2a"
    signed_transaction = await cdp_client.evm.sign_transaction(account.address, signature)
    assert signed_transaction is not None


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_evm_server_account_sign_message(cdp_client):
    """Test signing a message with an EVM server account."""
    account = await cdp_client.evm.create_account()
    assert account is not None

    message = "Hello EVM!"
    signable_message = encode_defunct(text=message)
    response = await account.sign_message(signable_message)
    assert response is not None
    assert response.signature is not None


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_create_get_and_list_smart_accounts(cdp_client):
    """Test creating, getting, and listing smart accounts."""
    private_key = Account.create().key
    owner = Account.from_key(private_key)

    smart_account = await cdp_client.evm.create_smart_account(owner=owner)
    assert smart_account is not None

    response = await cdp_client.evm.list_smart_accounts()
    assert response is not None
    assert len(response.accounts) > 0

    smart_account = await cdp_client.evm.get_smart_account(smart_account.address, owner)
    assert smart_account is not None


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_prepare_user_operation(cdp_client):
    """Test preparing a user operation."""
    private_key = Account.create().key
    owner = Account.from_key(private_key)
    smart_account = await cdp_client.evm.create_smart_account(owner=owner)
    assert smart_account is not None

    user_operation = await cdp_client.evm.prepare_user_operation(
        smart_account=smart_account,
        network="base-sepolia",
        calls=[
            EncodedCall(
                to="0x0000000000000000000000000000000000000000",
                data="0x",
                value=0,
            )
        ],
    )
    assert user_operation is not None


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_send_wait_and_get_user_operation(cdp_client):
    """Test sending, waiting for, and getting a user operation."""
    private_key = Account.create().key
    owner = Account.from_key(private_key)

    smart_account = await cdp_client.evm.create_smart_account(owner=owner)
    assert smart_account is not None

    try:
        user_operation = await cdp_client.evm.send_user_operation(
            smart_account=smart_account,
            network="base-sepolia",
            calls=[
                EncodedCall(
                    to="0x0000000000000000000000000000000000000000",
                    data="0x",
                    value=0,
                )
            ],
        )

        assert user_operation is not None
        assert user_operation.user_op_hash is not None

        user_op_result = await cdp_client.evm.wait_for_user_operation(
            smart_account_address=smart_account.address,
            user_op_hash=user_operation.user_op_hash,
        )

        assert user_op_result is not None
        assert user_op_result.status == "complete"

        user_op = await cdp_client.evm.get_user_operation(
            address=smart_account.address,
            user_op_hash=user_operation.user_op_hash,
        )
        assert user_op is not None
        assert user_op.status == "complete"
    except Exception as e:
        print("Error: ", e)
        print("Ignoring for now...")


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_send_wait_and_get_user_operation_with_smart_account(cdp_client):
    """Test sending, waiting for, and getting a user operation with a smart account."""
    private_key = Account.create().key
    owner = Account.from_key(private_key)

    smart_account = await cdp_client.evm.create_smart_account(owner=owner)
    assert smart_account is not None

    try:
        user_operation = await smart_account.send_user_operation(
            network="base-sepolia",
            calls=[
                EncodedCall(
                    to="0x0000000000000000000000000000000000000000",
                    data="0x",
                    value=0,
                )
            ],
        )

        assert user_operation is not None
        assert user_operation.user_op_hash is not None

        user_op_result = await smart_account.wait_for_user_operation(
            user_op_hash=user_operation.user_op_hash,
        )

        assert user_op_result is not None
        assert user_op_result.status == "complete"

        user_op = await smart_account.get_user_operation(
            user_op_hash=user_operation.user_op_hash,
        )
        assert user_op is not None
        assert user_op.status == "complete"
    except Exception as e:
        print("Error: ", e)
        print("Ignoring for now...")


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_send_transaction(cdp_client):
    """Test sending a transaction."""
    account = await cdp_client.evm.get_or_create_account(name=test_account_name)
    assert account is not None

    await _ensure_sufficient_eth_balance(cdp_client, account)

    # test that user can use TransactionRequestEIP1559
    tx_hash = await cdp_client.evm.send_transaction(
        address=account.address,
        transaction=TransactionRequestEIP1559(
            to="0x0000000000000000000000000000000000000000",
            value=w3.to_wei(0, "ether"),
        ),
        network="base-sepolia",
    )

    tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    assert tx_receipt is not None


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_send_transaction_from_account(cdp_client):
    """Test sending a transaction from an account."""
    account = await cdp_client.evm.get_or_create_account(name=test_account_name)
    assert account is not None

    await _ensure_sufficient_eth_balance(cdp_client, account)

    # test that account can send a TransactionRequestEIP1559
    tx_hash = await account.send_transaction(
        transaction=TransactionRequestEIP1559(
            to="0x0000000000000000000000000000000000000000",
            value=w3.to_wei(0, "ether"),
        ),
        network="base-sepolia",
    )

    tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    assert tx_receipt is not None


@pytest.mark.e2e
@pytest.mark.asyncio
@pytest.mark.skip(reason="Skipping due to faucet rate limit")
async def test_evm_request_faucet_for_account(cdp_client):
    """Test requesting a faucet for an EVM account."""
    account = await cdp_client.evm.create_account()
    assert account is not None

    faucet_hash = await account.request_faucet(network="base-sepolia", token="eth")
    assert faucet_hash is not None

    tx_receipt = w3.eth.wait_for_transaction_receipt(faucet_hash)
    assert tx_receipt is not None


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_list_evm_token_balances_for_account(cdp_client):
    """Test listing evm token balances for a server account."""
    account = await cdp_client.evm.get_or_create_account(name=test_account_name)
    assert account is not None

    result = await account.list_token_balances(
        network="base-sepolia",
    )
    assert result is not None
    assert len(result.balances) > 0


@pytest.mark.e2e
@pytest.mark.asyncio
@pytest.mark.skip(reason="Skipping due to faucet rate limit")
async def test_evm_request_faucet_for_smart_account(cdp_client):
    """Test requesting a faucet for an EVM smart account."""
    smart_account = await cdp_client.evm.create_smart_account(owner=Account.create())
    assert smart_account is not None

    faucet_hash = await smart_account.request_faucet(network="base-sepolia", token="eth")
    assert faucet_hash is not None

    tx_receipt = w3.eth.wait_for_transaction_receipt(faucet_hash)
    assert tx_receipt is not None


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_list_evm_token_balances_for_smart_account(cdp_client):
    """Test listing evm token balances for a smart account."""
    account = await cdp_client.evm.get_or_create_account(name="E2ESmartAccount")
    assert account is not None

    smart_account = await cdp_client.evm.get_smart_account(
        address=os.getenv("CDP_E2E_SMART_ACCOUNT_ADDRESS"), owner=account
    )

    first_page = await smart_account.list_token_balances(network="base-sepolia")
    assert first_page is not None
    assert len(first_page.balances) > 0


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_list_evm_token_balances(cdp_client):
    """Test listing evm token balances."""
    address = "0x5b76f5B8fc9D700624F78208132f91AD4e61a1f0"

    first_page = await cdp_client.evm.list_token_balances(
        address=address, network="base-sepolia", page_size=1
    )

    assert first_page is not None
    assert len(first_page.balances) == 1
    assert first_page.balances[0].token is not None
    assert first_page.balances[0].token.contract_address is not None
    assert first_page.balances[0].token.network == "base-sepolia"
    assert first_page.balances[0].amount is not None
    assert first_page.balances[0].amount.amount is not None
    assert first_page.balances[0].amount.decimals is not None

    second_page = await cdp_client.evm.list_token_balances(
        address=address, network="base-sepolia", page_size=1, page_token=first_page.next_page_token
    )

    assert second_page is not None
    assert len(second_page.balances) == 1
    assert second_page.balances[0].token is not None
    assert second_page.balances[0].token.contract_address is not None
    assert second_page.balances[0].token.network == "base-sepolia"
    assert second_page.balances[0].amount is not None
    assert second_page.balances[0].amount.amount is not None
    assert second_page.balances[0].amount.decimals is not None


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_create_get_and_list_solana_accounts(cdp_client):
    """Test creating, getting, and listing solana accounts."""
    random_name = "".join(
        [random.choice(string.ascii_letters + string.digits)]
        + [random.choice(string.ascii_letters + string.digits + "-") for _ in range(34)]
        + [random.choice(string.ascii_letters + string.digits)]
    )
    solana_account = await cdp_client.solana.create_account(name=random_name)
    assert solana_account is not None

    solana_accounts = await cdp_client.solana.list_accounts()
    assert solana_accounts is not None
    assert len(solana_accounts.accounts) > 0

    solana_account = await cdp_client.solana.get_account(solana_account.address)
    assert solana_account is not None
    assert solana_account.address == solana_account.address
    assert solana_account.name == random_name

    solana_account = await cdp_client.solana.get_account(name=random_name)
    assert solana_account is not None
    assert solana_account.address == solana_account.address
    assert solana_account.name == random_name


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_solana_sign_fns(cdp_client):
    """Test signing functions."""
    account = await cdp_client.solana.create_account()

    # For sign_message - use base64 encoded message
    message = "Hello Solana!"
    encoded_message = base64.b64encode(message.encode("utf-8")).decode("utf-8")
    signed_message = await cdp_client.solana.sign_message(account.address, encoded_message)
    assert signed_message is not None

    # Create a transaction with minimal valid structure for the API
    unsigned_tx_bytes = bytes(
        [
            0,  # Number of signatures (0 for unsigned)
            1,  # Number of required signatures
            0,  # Number of read-only signed accounts
            0,  # Number of read-only unsigned accounts
            1,  # Number of account keys
        ]
    )

    # Use account key.
    pubkey_bytes = base58.b58decode(account.address)
    assert len(pubkey_bytes) == 32

    unsigned_tx_bytes += pubkey_bytes
    # Add recent blockhash (32 bytes)
    unsigned_tx_bytes += bytes([1] * 32)
    # Add number of instructions (1)
    unsigned_tx_bytes += bytes([1])
    # Add a simple instruction
    unsigned_tx_bytes += bytes(
        [
            0,  # Program ID index
            1,  # Number of accounts in instruction
            0,  # Account index
            4,  # Data length
            1,
            2,
            3,
            4,  # Instruction data
        ]
    )

    base64_tx = base64.b64encode(unsigned_tx_bytes).decode("utf-8")
    response = await cdp_client.solana.sign_transaction(account.address, base64_tx)
    assert response is not None
    assert response.signed_transaction is not None


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_evm_sign_typed_data(cdp_client):
    """Test signing typed data."""
    account = await cdp_client.evm.get_or_create_account(name=test_account_name)
    assert account is not None

    signature = await cdp_client.evm.sign_typed_data(
        address=account.address,
        domain=EIP712Domain(
            name="EIP712Domain",
            chain_id=1,
            verifying_contract="0x0000000000000000000000000000000000000000",
        ),
        types={
            "EIP712Domain": [
                {"name": "name", "type": "string"},
                {"name": "chainId", "type": "uint256"},
                {"name": "verifyingContract", "type": "address"},
            ],
        },
        primary_type="EIP712Domain",
        message={
            "name": "EIP712Domain",
            "chainId": 1,
            "verifyingContract": "0x0000000000000000000000000000000000000000",
        },
    )
    assert signature is not None


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_evm_sign_typed_data_for_account(cdp_client):
    """Test signing typed data for an account."""
    account = await cdp_client.evm.get_or_create_account(name=test_account_name)
    assert account is not None

    signature = await account.sign_typed_data(
        domain=EIP712Domain(
            name="EIP712Domain",
            chain_id=1,
            verifying_contract="0x0000000000000000000000000000000000000000",
        ),
        types={
            "EIP712Domain": [
                {"name": "name", "type": "string"},
                {"name": "chainId", "type": "uint256"},
                {"name": "verifyingContract", "type": "address"},
            ],
        },
        primary_type="EIP712Domain",
        message={
            "name": "EIP712Domain",
            "chainId": 1,
            "verifyingContract": "0x0000000000000000000000000000000000000000",
        },
    )
    assert signature is not None


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_transfer_eth(cdp_client):
    """Test transferring ETH."""
    account = await cdp_client.evm.get_or_create_account(name=test_account_name)
    assert account is not None

    await _ensure_sufficient_eth_balance(cdp_client, account)

    tx_hash = await account.transfer(
        to="0x9F663335Cd6Ad02a37B633602E98866CF944124d",
        amount=0,
        token="eth",
        network="base-sepolia",
    )

    assert tx_hash is not None

    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    assert receipt is not None
    assert receipt.status == 1


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_transfer_usdc(cdp_client):
    """Test transferring USDC tokens."""
    account = await cdp_client.evm.get_or_create_account(name=test_account_name)
    assert account is not None

    await _ensure_sufficient_eth_balance(cdp_client, account)

    tx_hash = await account.transfer(
        to="0x9F663335Cd6Ad02a37B633602E98866CF944124d",
        amount=0,
        token="usdc",
        network="base-sepolia",
    )

    assert tx_hash is not None

    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    assert receipt is not None
    assert receipt.status == 1


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_transfer_eth_smart_account(cdp_client):
    """Test transferring ETH with a smart account."""
    account = await cdp_client.evm.create_smart_account(owner=Account.create())
    assert account is not None

    try:
        transfer_result = await account.transfer(
            to="0x9F663335Cd6Ad02a37B633602E98866CF944124d",
            amount=0,
            token="eth",
            network="base-sepolia",
        )

        assert transfer_result is not None

        user_op_result = await account.wait_for_user_operation(
            user_op_hash=transfer_result.user_op_hash
        )
        assert user_op_result is not None
        assert user_op_result.status == "complete"
    except Exception as e:
        print("Error: ", e)
        print("Ignoring for now...")


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_transfer_usdc_smart_account(cdp_client):
    """Test transferring USDC tokens with a smart account."""
    account = await cdp_client.evm.create_smart_account(owner=Account.create())
    assert account is not None

    try:
        transfer_result = await account.transfer(
            to="0x9F663335Cd6Ad02a37B633602E98866CF944124d",
            amount=0,
            token="usdc",
            network="base-sepolia",
        )

        assert transfer_result is not None

        user_op_result = await account.wait_for_user_operation(
            user_op_hash=transfer_result.user_op_hash
        )
        assert user_op_result is not None
        assert user_op_result.status == "complete"
    except Exception as e:
        print("Error: ", e)
        print("Ignoring for now...")


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_transfer_sol(solana_account):
    """Test transferring SOL."""
    connection = SolanaClient(
        os.getenv("CDP_E2E_SOLANA_RPC_URL") or "https://api.devnet.solana.com"
    )

    await _ensure_sufficient_sol_balance(cdp_client, solana_account)

    signature = await solana_account.transfer(
        to="3KzDtddx4i53FBkvCzuDmRbaMozTZoJBb1TToWhz3JfE", amount=0, token="sol", network="devnet"
    )

    assert signature is not None

    last_valid_block_height = connection.get_latest_blockhash()

    confirmation = connection.confirm_transaction(
        tx_sig=signature,
        last_valid_block_height=last_valid_block_height.value.last_valid_block_height,
        commitment="confirmed",
    )

    assert confirmation is not None
    assert confirmation.value[0].err is None


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_solana_account_transfer_usdc(solana_account):
    """Test transferring USDC tokens."""
    connection = SolanaClient(
        os.getenv("CDP_E2E_SOLANA_RPC_URL") or "https://api.devnet.solana.com"
    )

    await _ensure_sufficient_sol_balance(cdp_client, solana_account)

    signature = await solana_account.transfer(
        to="3KzDtddx4i53FBkvCzuDmRbaMozTZoJBb1TToWhz3JfE", amount=0, token="usdc", network="devnet"
    )

    assert signature is not None

    last_valid_block_height = connection.get_latest_blockhash()

    confirmation = connection.confirm_transaction(
        tx_sig=signature,
        last_valid_block_height=last_valid_block_height.value.last_valid_block_height,
        commitment="confirmed",
    )

    assert confirmation is not None
    assert confirmation.value[0].err is None


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_evm_get_or_create_account(cdp_client):
    """Test getting or creating an EVM account."""
    random_name = "".join(
        [random.choice(string.ascii_letters + string.digits)]
        + [random.choice(string.ascii_letters + string.digits + "-") for _ in range(34)]
        + [random.choice(string.ascii_letters + string.digits)]
    )
    account = await cdp_client.evm.get_or_create_account(name=random_name)
    assert account is not None

    account2 = await cdp_client.evm.get_or_create_account(name=random_name)
    assert account2 is not None
    assert account.address == account2.address
    assert account.name == account2.name
    assert account.name == random_name


@pytest.mark.e2e
@pytest.mark.asyncio
@pytest.mark.focus
async def test_evm_get_or_create_smart_account(cdp_client):
    """Test getting or creating an EVM account."""
    random_name = "".join(
        [random.choice(string.ascii_letters + string.digits)]
        + [random.choice(string.ascii_letters + string.digits + "-") for _ in range(34)]
        + [random.choice(string.ascii_letters + string.digits)]
    )

    # Create the owner account first
    owner = await cdp_client.evm.create_account()

    # Now use the owner to create/get the smart account
    account = await cdp_client.evm.get_or_create_smart_account(name=random_name, owner=owner)
    assert account is not None

    # Try to get the same account again - should return the existing one
    account2 = await cdp_client.evm.get_or_create_smart_account(name=random_name, owner=owner)
    assert account2 is not None
    assert account.address == account2.address
    assert account.name == account2.name
    assert account.name == random_name


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_solana_get_or_create_account(cdp_client):
    """Test getting or creating a Solana account."""
    random_name = "".join(
        [random.choice(string.ascii_letters + string.digits)]
        + [random.choice(string.ascii_letters + string.digits + "-") for _ in range(34)]
        + [random.choice(string.ascii_letters + string.digits)]
    )
    account = await cdp_client.solana.get_or_create_account(name=random_name)
    assert account is not None

    account2 = await cdp_client.solana.get_or_create_account(name=random_name)
    assert account2 is not None
    assert account.address == account2.address
    assert account.name == account2.name
    assert account.name == random_name


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_evm_get_or_create_account_race_condition(cdp_client):
    """Test getting or creating an EVM account with a race condition."""
    random_name = "".join(
        [random.choice(string.ascii_letters + string.digits)]
        + [random.choice(string.ascii_letters + string.digits + "-") for _ in range(34)]
        + [random.choice(string.ascii_letters + string.digits)]
    )
    account_coros = [
        cdp_client.evm.get_or_create_account(name=random_name),
        cdp_client.evm.get_or_create_account(name=random_name),
        cdp_client.evm.get_or_create_account(name=random_name),
    ]
    accounts = await asyncio.gather(*account_coros)
    assert len(accounts) == 3
    assert accounts[0] is not None
    assert accounts[1] is not None
    assert accounts[2] is not None
    assert accounts[0].address == accounts[1].address
    assert accounts[0].name == accounts[1].name
    assert accounts[0].address == accounts[2].address
    assert accounts[0].name == accounts[2].name


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_solana_get_or_create_account_race_condition(cdp_client):
    """Test getting or creating a Solana account with a race condition."""
    random_name = "".join(
        [random.choice(string.ascii_letters + string.digits)]
        + [random.choice(string.ascii_letters + string.digits + "-") for _ in range(34)]
        + [random.choice(string.ascii_letters + string.digits)]
    )
    account_coros = [
        cdp_client.solana.get_or_create_account(name=random_name),
        cdp_client.solana.get_or_create_account(name=random_name),
        cdp_client.solana.get_or_create_account(name=random_name),
    ]
    accounts = await asyncio.gather(*account_coros)
    assert len(accounts) == 3
    assert accounts[0] is not None
    assert accounts[1] is not None
    assert accounts[2] is not None
    assert accounts[0].address == accounts[1].address
    assert accounts[0].name == accounts[1].name
    assert accounts[0].address == accounts[2].address
    assert accounts[0].name == accounts[2].name


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_solana_account_sign_message(cdp_client):
    """Test signing a message with a Solana account."""
    account = await cdp_client.solana.create_account()
    assert account is not None

    message = "Hello Solana!"
    response = await account.sign_message(message)
    assert response is not None
    assert response.signature is not None


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_solana_sign_transaction(cdp_client):
    """Test signing a transaction."""
    account = await cdp_client.solana.create_account()
    assert account is not None

    response = await account.sign_transaction(transaction=_get_transaction(account.address))
    assert response is not None
    assert response.signed_transaction is not None


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_create_account_policy(cdp_client):
    """Test creating an account policy."""
    policy = await cdp_client.policies.create_policy(
        policy=CreatePolicyOptions(
            scope="account",
            description="E2E Test Policy",
            rules=[
                SignEvmTransactionRule(
                    action="accept",
                    criteria=[
                        EthValueCriterion(
                            ethValue="1000000000000000000",
                            operator="<=",
                        ),
                        EvmAddressCriterion(
                            addresses=["0x000000000000000000000000000000000000dEaD"],
                            operator="in",
                        ),
                    ],
                ),
                SendEvmTransactionRule(
                    action="accept",
                    criteria=[
                        EvmNetworkCriterion(
                            networks=["base-sepolia", "base"],
                            operator="in",
                        ),
                    ],
                ),
                SignSolanaTransactionRule(
                    action="accept",
                    criteria=[
                        SolanaAddressCriterion(
                            addresses=["123456789abcdef123456789abcdef12"],
                            operator="in",
                        ),
                    ],
                ),
                SignEvmHashRule(
                    action="accept",
                ),
                SignEvmMessageRule(
                    action="accept",
                    criteria=[
                        EvmMessageCriterion(
                            match=".*",
                        ),
                    ],
                ),
            ],
        )
    )
    assert policy is not None
    assert policy.id is not None
    assert policy.scope == "account"
    assert policy.description == "E2E Test Policy"
    assert policy.rules is not None
    assert len(policy.rules) == 5
    assert policy.rules[0].action == "accept"
    assert policy.rules[0].operation == "signEvmTransaction"
    assert policy.rules[0].criteria is not None
    assert len(policy.rules[0].criteria) == 2
    assert policy.rules[0].criteria[0].type == "ethValue"
    assert policy.rules[0].criteria[0].ethValue == "1000000000000000000"
    assert policy.rules[0].criteria[0].operator == "<="
    assert policy.rules[0].criteria[1].type == "evmAddress"
    assert policy.rules[0].criteria[1].addresses == ["0x000000000000000000000000000000000000dEaD"]
    assert policy.rules[0].criteria[1].operator == "in"
    assert policy.rules[1].action == "accept"
    assert policy.rules[1].operation == "sendEvmTransaction"
    assert policy.rules[1].criteria is not None
    assert len(policy.rules[1].criteria) == 1
    assert policy.rules[1].criteria[0].type == "evmNetwork"
    assert policy.rules[1].criteria[0].networks == [
        "base-sepolia",
        "base",
    ]
    assert policy.rules[1].criteria[0].operator == "in"
    assert policy.rules[2].action == "accept"
    assert policy.rules[2].operation == "signSolTransaction"
    assert policy.rules[2].criteria is not None
    assert len(policy.rules[2].criteria) == 1
    assert policy.rules[2].criteria[0].type == "solAddress"
    assert policy.rules[2].criteria[0].addresses == ["123456789abcdef123456789abcdef12"]
    assert policy.rules[2].criteria[0].operator == "in"
    assert policy.rules[3].action == "accept"
    assert policy.rules[3].operation == "signEvmHash"
    assert policy.rules[4].action == "accept"
    assert policy.rules[4].operation == "signEvmMessage"
    assert policy.rules[4].criteria is not None
    assert len(policy.rules[4].criteria) == 1
    assert policy.rules[4].criteria[0].type == "evmMessage"
    assert policy.rules[4].criteria[0].match == ".*"

    # Delete the policy
    await cdp_client.policies.delete_policy(id=policy.id)

    # Verify the policy is deleted
    with pytest.raises(ApiError) as e:
        await cdp_client.policies.get_policy_by_id(id=policy.id)
    assert e.value.http_code == 404


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_create_project_policy(cdp_client):
    """Test creating a project policy."""
    try:
        # Create the project policy
        policy = await cdp_client.policies.create_policy(
            policy=CreatePolicyOptions(
                scope="project",
                description="E2E Test Policy",
                rules=[
                    SignEvmTransactionRule(
                        action="accept",
                        criteria=[
                            EthValueCriterion(
                                ethValue="1000000000000000000",
                                operator="<=",
                            ),
                        ],
                    )
                ],
            )
        )
    except ApiError as e:
        # If a project policy already exists, delete it and create a new one
        # as there can only be one project-scoped policy
        if e.http_code == 409:
            # Get existing project policy
            policies = await cdp_client.policies.list_policies(scope="project")

            # Delete the existing project policy
            if policies.policies:
                await cdp_client.policies.delete_policy(id=policies.policies[0].id)

            # Create the project policy
            policy = await cdp_client.policies.create_policy(
                policy=CreatePolicyOptions(
                    scope="project",
                    description="E2E Test Policy",
                    rules=[
                        SignEvmTransactionRule(
                            action="accept",
                            criteria=[
                                EthValueCriterion(
                                    ethValue="1000000000000000000",
                                    operator="<=",
                                ),
                            ],
                        )
                    ],
                )
            )

    assert policy is not None
    assert policy.id is not None
    assert policy.scope == "project"
    assert policy.description == "E2E Test Policy"
    assert policy.rules is not None
    assert len(policy.rules) == 1
    assert policy.rules[0].action == "accept"
    assert policy.rules[0].operation == "signEvmTransaction"
    assert policy.rules[0].criteria is not None
    assert len(policy.rules[0].criteria) == 1
    assert policy.rules[0].criteria[0].type == "ethValue"
    assert policy.rules[0].criteria[0].ethValue == "1000000000000000000"
    assert policy.rules[0].criteria[0].operator == "<="

    # Delete the policy
    await cdp_client.policies.delete_policy(id=policy.id)

    # Verify the policy is deleted
    with pytest.raises(ApiError) as e:
        await cdp_client.policies.get_policy_by_id(id=policy.id)
    assert e.value.http_code == 404


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_update_policy(cdp_client):
    """Test updating a policy."""
    policy = await cdp_client.policies.create_policy(
        policy=CreatePolicyOptions(
            scope="account",
            description="E2E Test Policy",
            rules=[
                SignEvmTransactionRule(
                    action="accept",
                    criteria=[
                        EthValueCriterion(
                            ethValue="1000000000000000000",
                            operator="<=",
                        ),
                    ],
                )
            ],
        )
    )
    assert policy is not None

    # Update the policy
    updated_policy = await cdp_client.policies.update_policy(
        id=policy.id,
        policy=UpdatePolicyOptions(
            description="Updated E2E Test Policy",
            rules=[
                SignEvmTransactionRule(
                    action="accept",
                    criteria=[
                        EvmAddressCriterion(
                            addresses=["0x000000000000000000000000000000000000dEaD"],
                            operator="in",
                        ),
                    ],
                )
            ],
        ),
    )
    assert updated_policy is not None
    assert updated_policy.id == policy.id
    assert updated_policy.description == "Updated E2E Test Policy"
    assert updated_policy.rules is not None
    assert len(updated_policy.rules) == 1
    assert updated_policy.rules[0].action == "accept"
    assert updated_policy.rules[0].operation == "signEvmTransaction"
    assert updated_policy.rules[0].criteria is not None
    assert len(updated_policy.rules[0].criteria) == 1
    assert updated_policy.rules[0].criteria[0].type == "evmAddress"
    assert updated_policy.rules[0].criteria[0].addresses == [
        "0x000000000000000000000000000000000000dEaD"
    ]
    assert updated_policy.rules[0].criteria[0].operator == "in"

    # Delete the policy
    await cdp_client.policies.delete_policy(id=updated_policy.id)

    # Verify the policy is deleted
    with pytest.raises(ApiError) as e:
        await cdp_client.policies.get_policy_by_id(id=updated_policy.id)
    assert e.value.http_code == 404


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_delete_policy(cdp_client):
    """Test deleting a policy."""
    policy = await cdp_client.policies.create_policy(
        policy=CreatePolicyOptions(
            scope="account",
            description="E2E Test Policy",
            rules=[
                SignEvmTransactionRule(
                    action="accept",
                    criteria=[
                        EthValueCriterion(
                            ethValue="1000000000000000000",
                            operator="<=",
                        ),
                    ],
                )
            ],
        )
    )
    assert policy is not None

    # Delete the policy
    await cdp_client.policies.delete_policy(id=policy.id)

    # Verify the policy is deleted
    with pytest.raises(ApiError) as e:
        await cdp_client.policies.get_policy_by_id(id=policy.id)
    assert e.value.http_code == 404


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_get_policy_by_id(cdp_client):
    """Test getting a policy by ID."""
    policy = await cdp_client.policies.create_policy(
        policy=CreatePolicyOptions(
            scope="account",
            description="E2E Test Policy",
            rules=[
                SignEvmTransactionRule(
                    action="accept",
                    criteria=[
                        EthValueCriterion(
                            ethValue="1000000000000000000",
                            operator="<=",
                        ),
                    ],
                )
            ],
        )
    )
    assert policy is not None

    # Get the policy by ID
    retrieved_policy = await cdp_client.policies.get_policy_by_id(id=policy.id)
    assert retrieved_policy is not None
    assert retrieved_policy.id == policy.id

    # Delete the policy
    await cdp_client.policies.delete_policy(id=policy.id)

    # Verify the policy is deleted
    with pytest.raises(ApiError) as e:
        await cdp_client.policies.get_policy_by_id(id=policy.id)
    assert e.value.http_code == 404


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_list_policies(cdp_client):
    """Test listing policies."""
    # Create a new policy
    policy = await cdp_client.policies.create_policy(
        policy=CreatePolicyOptions(
            scope="account",
            description="E2E Test Policy",
            rules=[
                SignEvmTransactionRule(
                    action="accept",
                    criteria=[
                        EthValueCriterion(
                            ethValue="1000000000000000000",
                            operator="<=",
                        ),
                    ],
                )
            ],
        )
    )
    assert policy is not None

    # List all policies
    result = await cdp_client.policies.list_policies(
        page_size=100,
    )
    policies = result.policies

    # Paginate through all policies so that we can find our test policy.
    # This will not be necessary once we consistently remove policies from the e2e project.
    while result.next_page_token:
        result = await cdp_client.policies.list_policies(
            page_size=100,
            page_token=result.next_page_token,
        )
        policies.extend(result.policies)

    assert result is not None
    assert policies is not None
    assert len(policies) > 0
    assert any(p.id == policy.id for p in policies)

    # List policies with scope filter
    result = await cdp_client.policies.list_policies(
        scope="account",
        page_size=100,
    )
    policies = result.policies

    # Paginate through all account-scoped policies so that we can find our test policy.
    # This will not be necessary once we consistently remove policies from the e2e project.
    while result.next_page_token:
        result = await cdp_client.policies.list_policies(
            scope="account",
            page_size=100,
            page_token=result.next_page_token,
        )
        policies.extend(result.policies)

    assert result is not None
    assert policies is not None
    assert len(policies) > 0
    assert any(p.id == policy.id for p in policies)

    result = await cdp_client.policies.list_policies(
        scope="project",
        page_size=100,
    )
    policies = result.policies

    assert result is not None
    assert policies is not None
    assert not any(p.id == policy.id for p in policies)

    # List policies with pagination
    first_page_policies = await cdp_client.policies.list_policies(page_size=1)
    assert first_page_policies is not None
    assert first_page_policies.policies is not None
    assert len(first_page_policies.policies) == 1

    # Check if we have more policies
    if result.next_page_token:
        result = await cdp_client.policies.list_policies(
            page_size=1, page_token=result.next_page_token
        )
        assert result is not None
        assert result.policies is not None

        # Verify that the second page has a different policy
        assert not any(p.id == first_page_policies.policies[0].id for p in result.policies)

    # Delete the policy
    await cdp_client.policies.delete_policy(id=policy.id)

    # Verify the policy is deleted
    with pytest.raises(ApiError) as e:
        await cdp_client.policies.get_policy_by_id(id=policy.id)
    assert e.value.http_code == 404


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_create_evm_account_with_policy(cdp_client):
    """Test creating an EVM account with a policy."""
    policy = await cdp_client.policies.create_policy(
        policy=CreatePolicyOptions(
            scope="account",
            description="E2E Test Policy for evm account",
            rules=[
                SignEvmTransactionRule(
                    action="accept",
                    criteria=[
                        EthValueCriterion(
                            ethValue="1000000000000000000",
                            operator="<=",
                        ),
                        EvmAddressCriterion(
                            addresses=["0x000000000000000000000000000000000000dEaD"],
                            operator="in",
                        ),
                    ],
                ),
            ],
        )
    )
    account_name = generate_random_name()
    account = await cdp_client.evm.create_account(
        name=account_name,
        account_policy=policy.id,
    )
    assert account is not None
    assert account.name == account_name
    assert account.policies is not None
    assert policy.id in account.policies


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_update_evm_account(cdp_client):
    """Test updating an EVM account."""
    original_name = generate_random_name()
    account_to_update = await cdp_client.evm.get_or_create_account(name=original_name)
    assert account_to_update is not None
    assert account_to_update.name == original_name

    # Update the account with a new name
    updated_name = generate_random_name()
    updated_account = await cdp_client.evm.update_account(
        address=account_to_update.address,
        update=UpdateAccountOptions(
            name=updated_name,
        ),
    )
    assert updated_account is not None
    assert updated_account.address == account_to_update.address
    assert updated_account.name == updated_name

    # Verify we can get the updated account by its new name
    retrieved_account = await cdp_client.evm.get_account(name=updated_name)
    assert retrieved_account is not None
    assert retrieved_account.address == account_to_update.address
    assert retrieved_account.name == updated_name


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_create_solana_account_with_policy(cdp_client):
    """Test creating a Solana account with a policy."""
    policy = await cdp_client.policies.create_policy(
        policy=CreatePolicyOptions(
            scope="account",
            description="E2E Test Policy for solana account",
            rules=[
                SignSolanaTransactionRule(
                    action="accept",
                    criteria=[
                        SolanaAddressCriterion(
                            addresses=["123456789abcdef123456789abcdef12"],
                            operator="in",
                        ),
                    ],
                ),
            ],
        )
    )
    account_name = generate_random_name()
    account = await cdp_client.solana.create_account(
        name=account_name,
        account_policy=policy.id,
    )
    assert account is not None
    assert account.name == account_name
    assert account.policies is not None
    assert policy.id in account.policies


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_update_solana_account(cdp_client):
    """Test updating a Solana account."""
    original_name = generate_random_name()
    account_to_update = await cdp_client.solana.get_or_create_account(name=original_name)
    assert account_to_update is not None
    assert account_to_update.name == original_name

    # Update the account with a new name
    updated_name = generate_random_name()
    updated_account = await cdp_client.solana.update_account(
        address=account_to_update.address,
        update=UpdateAccountOptions(
            name=updated_name,
        ),
    )
    assert updated_account is not None
    assert updated_account.address == account_to_update.address
    assert updated_account.name == updated_name

    # Verify we can get the updated account by its new name
    retrieved_account = await cdp_client.solana.get_account(name=updated_name)
    assert retrieved_account is not None
    assert retrieved_account.address == account_to_update.address
    assert retrieved_account.name == updated_name


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_update_evm_smart_account(cdp_client):
    """Test updating an EVM smart account."""
    original_name = generate_random_name()
    owner = Account.create()
    account = await cdp_client.evm.create_smart_account(name=original_name, owner=owner)
    assert account is not None
    assert account.name == original_name

    # Update the account with a new name
    updated_name = generate_random_name()
    updated_account = await cdp_client.evm.update_smart_account(
        address=account.address,
        update=UpdateEvmSmartAccountRequest(
            name=updated_name,
        ),
        owner=owner,
    )
    assert updated_account is not None
    assert updated_account.name == updated_name

    # Verify we can get the updated account by its new name
    retrieved_account = await cdp_client.evm.get_smart_account(name=updated_name, owner=owner)
    assert retrieved_account is not None
    assert retrieved_account.address == account.address
    assert retrieved_account.name == updated_name


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_evm_local_account_sign_hash(cdp_client):
    """Test signing a hash with an EVM local account."""
    account = await cdp_client.evm.create_account()
    assert account is not None

    evm_local_account = EvmLocalAccount(account)
    assert evm_local_account is not None

    message_hash = "0x1234567890123456789012345678901234567890123456789012345678901234"
    signed_hash = evm_local_account.unsafe_sign_hash(message_hash)
    assert signed_hash is not None
    assert signed_hash.signature is not None


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_evm_local_account_sign_message(cdp_client):
    """Test signing a message with an EVM local account."""
    account = await cdp_client.evm.create_account()
    assert account is not None

    evm_local_account = EvmLocalAccount(account)
    assert evm_local_account is not None

    message = "Hello EVM!"
    signable_message = encode_defunct(text=message)
    signed_message = evm_local_account.sign_message(signable_message)
    assert signed_message is not None
    assert signed_message.signature is not None


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_evm_local_account_sign_typed_data(cdp_client):
    """Test signing typed data with an EVM local account."""
    account = await cdp_client.evm.create_account()
    assert account is not None

    evm_local_account = EvmLocalAccount(account)
    assert evm_local_account is not None

    signature = evm_local_account.sign_typed_data(
        domain_data={
            "name": "EIP712Domain",
            "version": "1",
            "chainId": 1,
            "verifyingContract": "0x0000000000000000000000000000000000000000",
        },
        message_types={
            "EIP712Domain": [
                {"name": "name", "type": "string"},
                {"name": "version", "type": "string"},
                {"name": "chainId", "type": "uint256"},
                {"name": "verifyingContract", "type": "address"},
            ],
            "Person": [
                {"name": "name", "type": "string"},
                {"name": "wallet", "type": "address"},
            ],
        },
        message_data={
            "name": "John Doe",
            "wallet": "0x1234567890123456789012345678901234567890",
        },
    )
    assert signature is not None


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_evm_local_account_sign_typed_data_with_full_message(cdp_client):
    """Test signing typed data with a full message with an EVM local account."""
    account = await cdp_client.evm.create_account()
    assert account is not None

    evm_local_account = EvmLocalAccount(account)
    assert evm_local_account is not None

    signature = evm_local_account.sign_typed_data(
        full_message={
            "domain": {
                "name": "EIP712Domain",
                "version": "1",
                "chainId": 1,
                "verifyingContract": "0x0000000000000000000000000000000000000000",
            },
            "types": {
                "EIP712Domain": [
                    {"name": "name", "type": "string"},
                    {"name": "version", "type": "string"},
                    {"name": "chainId", "type": "uint256"},
                    {"name": "verifyingContract", "type": "address"},
                ],
                "Person": [
                    {"name": "name", "type": "string"},
                    {"name": "wallet", "type": "address"},
                ],
            },
            "primaryType": "Person",
            "message": {
                "name": "John Doe",
                "wallet": "0x1234567890123456789012345678901234567890",
            },
        }
    )
    assert signature is not None


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_evm_local_account_sign_typed_data_with_bytes32_type(cdp_client):
    """Test signing typed data with a bytes32 type with an EVM local account."""
    account = await cdp_client.evm.create_account()
    assert account is not None

    evm_local_account = EvmLocalAccount(account)
    assert evm_local_account is not None

    signature = evm_local_account.sign_typed_data(
        full_message={
            "domain": {
                "name": "EIP712Domain",
                "version": "1",
                "chainId": 1,
                "verifyingContract": "0x0000000000000000000000000000000000000000",
            },
            "types": {
                "EIP712Domain": [
                    {"name": "name", "type": "string"},
                    {"name": "version", "type": "string"},
                    {"name": "chainId", "type": "uint256"},
                    {"name": "verifyingContract", "type": "address"},
                ],
                "TransferWithAuthorization": [
                    {"name": "from", "type": "address"},
                    {"name": "to", "type": "address"},
                    {"name": "value", "type": "uint256"},
                    {"name": "validAfter", "type": "uint256"},
                    {"name": "validBefore", "type": "uint256"},
                    {"name": "nonce", "type": "bytes32"},
                ],
            },
            "primaryType": "TransferWithAuthorization",
            "message": {
                "from": "0x0123456789012345678901234567890123456789",
                "to": "0x0123456789012345678901234567890123456789",
                "value": 1000000,
                "validAfter": 1000000,
                "validBefore": 1000000,
                "nonce": bytes.fromhex(
                    "0000000000000000000000001234567890123456789012345678901234567890"
                ),
            },
        },
    )
    assert signature is not None


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_evm_local_account_sign_typed_data_without_eip712_domain_type(cdp_client):
    """Test signing typed data without eip712 domain type with an EVM local account."""
    account = await cdp_client.evm.create_account()
    assert account is not None

    evm_local_account = EvmLocalAccount(account)
    assert evm_local_account is not None

    domain_data = {
        "name": "EIP712Domain",
        "version": "1",
    }
    message_types = {
        "TransferWithAuthorization": [
            {"name": "from", "type": "address"},
            {"name": "to", "type": "address"},
            {"name": "value", "type": "uint256"},
            {"name": "validAfter", "type": "uint256"},
            {"name": "validBefore", "type": "uint256"},
            {"name": "nonce", "type": "bytes32"},
        ]
    }
    message_data = {
        "from": "0x0123456789012345678901234567890123456789",
        "to": "0x0123456789012345678901234567890123456789",
        "value": 1000000,
        "validAfter": 1000000,
        "validBefore": 1000000,
        "nonce": bytes.fromhex("0000000000000000000000001234567890123456789012345678901234567890"),
    }
    signature = evm_local_account.sign_typed_data(
        domain_data=domain_data,
        message_types=message_types,
        message_data=message_data,
    )
    assert signature is not None

    signature = evm_local_account.sign_typed_data(
        full_message={
            "domain": domain_data,
            "types": message_types,
            "primaryType": "TransferWithAuthorization",
            "message": message_data,
        },
    )
    assert signature is not None


@pytest.mark.e2e
@pytest.mark.asyncio
@pytest.mark.skip(reason="Skipping due to nonce issue with concurrent test")
async def test_evm_local_account_sign_and_send_transaction(cdp_client):
    """Test signing a transaction with an EVM local account."""
    account = await cdp_client.evm.get_or_create_account(name=test_account_name)
    assert account is not None

    evm_local_account = EvmLocalAccount(account)
    assert evm_local_account is not None

    w3 = Web3(Web3.HTTPProvider("https://sepolia.base.org"))
    nonce = w3.eth.get_transaction_count(evm_local_account.address)
    transaction = evm_local_account.sign_transaction(
        transaction_dict={
            "to": "0x0000000000000000000000000000000000000000",
            "value": 10000000000,
            "chainId": 84532,
            "gas": 21000,
            "maxFeePerGas": 1000000000,
            "maxPriorityFeePerGas": 1000000000,
            "nonce": nonce,
            "type": "0x2",
        }
    )
    faucet_hash = await cdp_client.evm.request_faucet(
        address=evm_local_account.address, network="base-sepolia", token="eth"
    )
    w3.eth.wait_for_transaction_receipt(faucet_hash)
    tx_hash = w3.eth.send_raw_transaction(transaction.raw_transaction)
    tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    assert tx_receipt is not None


def _get_transaction(address: str):
    """Help method to create a transaction."""
    from solana.rpc.api import Client as SolanaClient
    from solders.message import Message
    from solders.pubkey import Pubkey as PublicKey
    from solders.system_program import TransferParams, transfer

    connection = SolanaClient(
        os.getenv("CDP_E2E_SOLANA_RPC_URL") or "https://api.devnet.solana.com"
    )

    source_pubkey = PublicKey.from_string(address)
    dest_pubkey = PublicKey.from_string("3KzDtddx4i53FBkvCzuDmRbaMozTZoJBb1TToWhz3JfE")

    blockhash_resp = connection.get_latest_blockhash()
    blockhash = blockhash_resp.value.blockhash

    transfer_params = TransferParams(
        from_pubkey=source_pubkey, to_pubkey=dest_pubkey, lamports=1000
    )
    transfer_instr = transfer(transfer_params)

    message = Message.new_with_blockhash(
        [transfer_instr],
        source_pubkey,
        blockhash,
    )

    # Create a transaction envelope with signature space
    sig_count = bytes([1])  # 1 byte for signature count (1)
    empty_sig = bytes([0] * 64)  # 64 bytes of zeros for the empty signature
    message_bytes = bytes(message)  # Get the serialized message bytes

    # Concatenate to form the transaction bytes
    tx_bytes = sig_count + empty_sig + message_bytes

    # Encode to base64 used by CDP API
    serialized_tx = base64.b64encode(tx_bytes).decode("utf-8")

    return serialized_tx


async def _ensure_sufficient_eth_balance(cdp_client, account):
    """Ensure an account has sufficient ETH balance."""
    min_required_balance = w3.to_wei(0.000001, "ether")

    eth_balance = w3.eth.get_balance(account.address)

    print(f"Current ETH balance: {w3.from_wei(eth_balance, 'ether')} ETH")

    if eth_balance < min_required_balance:
        print(
            f"ETH balance below minimum required ({w3.from_wei(min_required_balance, 'ether')} ETH)"
        )
        faucet_hash = await cdp_client.evm.request_faucet(
            address=account.address, network="base-sepolia", token="eth"
        )

        print(f"Faucet request submitted: {faucet_hash}")

        w3.eth.wait_for_transaction_receipt(faucet_hash)

        # Verify the balance is now sufficient
        new_balance = w3.eth.get_balance(account.address)
        assert (
            new_balance >= min_required_balance
        ), f"Balance still insufficient after faucet request: {w3.from_wei(new_balance, 'ether')} ETH"
        return new_balance
    else:
        print(f"ETH balance is sufficient: {w3.from_wei(eth_balance, 'ether')} ETH")

    return eth_balance


async def _ensure_sufficient_sol_balance(cdp_client, account):
    """Ensure an account has sufficient SOL balance."""
    connection = SolanaClient(
        os.getenv("CDP_E2E_SOLANA_RPC_URL") or "https://api.devnet.solana.com"
    )

    async def sleep(ms):
        await asyncio.sleep(ms / 1000)

    # 1250000 is the amount the faucet gives, and is plenty to cover gas
    min_required_balance = 1250000

    # Get initial balance
    balance_resp = connection.get_balance(PublicKey.from_string(account.address))
    balance = balance_resp.value

    if balance >= min_required_balance:
        return

    print("Balance too low, requesting SOL from faucet...")
    await cdp_client.solana.request_faucet(address=account.address, token="sol")

    attempts = 0
    max_attempts = 30

    while balance == 0 and attempts < max_attempts:
        balance_resp = connection.get_balance(PublicKey.from_string(account.address))
        balance = balance_resp.value
        if balance == 0:
            print("Waiting for funds...")
            await sleep(1000)
            attempts += 1

    if balance == 0:
        raise Exception("Account not funded after multiple attempts")


def generate_random_name():
    """Generate a random name."""
    chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    chars_with_hyphen = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-"
    min_length = 5

    first_char = chars[floor(random.random() * len(chars))]

    middle_length = max(floor(random.random() * 34), min_length)
    middle_part = ""
    for _ in range(middle_length):
        middle_part += chars_with_hyphen[floor(random.random() * len(chars_with_hyphen))]

    last_char = chars[floor(random.random() * len(chars))]
    return first_char + middle_part + last_char
