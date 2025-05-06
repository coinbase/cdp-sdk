import asyncio
import base64
import random
import string

import pytest
import pytest_asyncio
from dotenv import load_dotenv
from eth_account.account import Account
from web3 import Web3

from cdp import CdpClient
from cdp.actions.evm.transfer.types import TransferOptions
from cdp.evm_call_types import EncodedCall
from cdp.evm_transaction_types import TransactionRequestEIP1559

load_dotenv()

w3 = Web3(Web3.HTTPProvider("https://sepolia.base.org"))


@pytest_asyncio.fixture(scope="function")
async def cdp_client():
    """Create and configure CDP client for all tests."""
    client = CdpClient()
    yield client
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


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_send_transaction(cdp_client):
    """Test sending a transaction."""
    account = await cdp_client.evm.get_account(name="E2ETestAccount")
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

    # Add a dummy account key (32 bytes)
    unsigned_tx_bytes += bytes([0] * 32)
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
async def test_transfer_eth(cdp_client):
    """Test transferring ETH."""
    account = await cdp_client.evm.create_account()
    assert account is not None

    await _ensure_sufficient_eth_balance(cdp_client, account)

    transfer_result = await account.transfer(
        TransferOptions(
            to="0x9F663335Cd6Ad02a37B633602E98866CF944124d",
            amount="0",
            token="eth",
            network="base-sepolia",
        )
    )

    assert transfer_result is not None
    assert transfer_result.status == "success"


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_transfer_usdc(cdp_client):
    """Test transferring USDC tokens."""
    account = await cdp_client.evm.create_account()
    assert account is not None

    await _ensure_sufficient_eth_balance(cdp_client, account)

    transfer_result = await account.transfer(
        TransferOptions(
            to="0x9F663335Cd6Ad02a37B633602E98866CF944124d",
            amount="0",
            token="usdc",
            network="base-sepolia",
        )
    )

    assert transfer_result is not None
    assert transfer_result.status == "success"


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_transfer_eth_smart_account(cdp_client):
    """Test transferring ETH with a smart account."""
    account = await cdp_client.evm.create_smart_account(owner=Account.create())
    assert account is not None

    await _ensure_sufficient_eth_balance(cdp_client, account)

    transfer_result = await account.transfer(
        TransferOptions(
            to="0x9F663335Cd6Ad02a37B633602E98866CF944124d",
            amount="0",
            token="eth",
            network="base-sepolia",
        )
    )

    assert transfer_result is not None
    assert transfer_result.status == "success"


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_transfer_usdc_smart_account(cdp_client):
    """Test transferring USDC tokens with a smart account."""
    account = await cdp_client.evm.create_smart_account(owner=Account.create())
    assert account is not None

    await _ensure_sufficient_eth_balance(cdp_client, account)

    transfer_result = await account.transfer(
        TransferOptions(
            to="0x9F663335Cd6Ad02a37B633602E98866CF944124d",
            amount="0",
            token="usdc",
            network="base-sepolia",
        )
    )

    assert transfer_result is not None
    assert transfer_result.status == "success"


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
