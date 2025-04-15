# Usage: uv run python cdp/examples/evm/create_smart_wallet_and_send.py

import asyncio
from decimal import Decimal
from dotenv import load_dotenv
import os

from eth_account import Account
from web3 import Web3
from cdp import CdpClient
from cdp.evm_call_types import EncodedCall


async def main():
    load_dotenv()

    cdp = CdpClient(
        api_key_id=os.getenv("CDP_API_KEY_NAME"),
        api_key_secret=os.getenv("CDP_API_KEY_SECRET"),
        wallet_secret=os.getenv("CDP_WALLET_SECRET"),
        base_path=os.getenv("CDP_API_URL"),
    )

    # create evm account
    private_key = Account.create().key
    owner = Account.from_key(private_key)
    # create evm smart account
    evm_smart_account = await cdp.evm.create_smart_account(owner)
    print("Smart account address:", evm_smart_account.address)

    # Faucet eth to the evm smart account
    print("Requesting faucet")
    await cdp.evm.request_faucet(
        address=evm_smart_account.address, network="base-sepolia", token="eth"
    )
    # sleep for 10 seconds
    print("Waiting for faucet")
    await asyncio.sleep(10)

    print("Faucet received")
    print("Sending user operation")
    user_operation = await cdp.evm.send_user_operation(
        smart_account=evm_smart_account,
        calls=[
            EncodedCall(
                to="0x0000000000000000000000000000000000000000",
                data="0x",
                value=Web3.to_wei(Decimal("0.0000005"), "ether"),
            )
        ],
        network="base-sepolia",
    )

    user_operation = await cdp.evm.wait_for_user_operation(
        smart_account_address=evm_smart_account.address,
        user_op_hash=user_operation.user_op_hash,
    )
    print("User operation sent")
    print("Transaction hash:", user_operation.transaction_hash)

    await cdp.close()


# Run the async function
asyncio.run(main())
