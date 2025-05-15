# Coinbase Developer Platform (CDP) Python SDK

## Table of Contents

- [CDP SDK](#cdp-sdk)
- [Documentation](#documentation)
- [Installation](#installation)
- [API Keys](#api-keys)
- [Usage](#usage)
- [Authentication tools](#authentication-tools)
- [Error Reporting](#error-reporting)
- [License](#license)
- [Support](#support)
- [Security](#security)

> [!TIP]
> If you're looking to contribute to the SDK, please see the [Contributing Guide](https://github.com/coinbase/cdp-sdk/blob/main/python/CONTRIBUTING.md).

## CDP SDK

This module contains the Python CDP SDK, which is a library that provides a client for interacting with the [Coinbase Developer Platform (CDP)](https://docs.cdp.coinbase.com/). It includes a CDP Client for interacting with EVM and Solana APIs to create accounts and send transactions, policy APIs to govern transaction permissions, as well as authentication tools for interacting directly with the CDP APIs.

## Documentation

CDP SDK has [auto-generated docs for the Python SDK](https://coinbase.github.io/cdp-sdk/python).

Further documentation is also available on the CDP docs website:

- [Wallet API v2](https://docs.cdp.coinbase.com/wallet-api-v2/docs/welcome)
- [API Reference](https://docs.cdp.coinbase.com/api-v2/docs/welcome)

## Installation

```bash
pip install cdp-sdk
```

## API Keys

To start, [create a CDP API Key](https://portal.cdp.coinbase.com/access/api). Save the `API Key ID` and `API Key Secret` for use in the SDK. You will also need to create a wallet secret in the Portal to sign transactions.

## Usage

### Initialization

#### Load client config from shell

One option is to export your CDP API Key and Wallet Secret as environment variables:

```bash
export CDP_API_KEY_ID="YOUR_API_KEY_ID"
export CDP_API_KEY_SECRET="YOUR_API_KEY_SECRET"
export CDP_WALLET_SECRET="YOUR_WALLET_SECRET"
```

Then, initialize the client:

```python
from cdp import CdpClient
import asyncio

async def main():
    async with CdpClient() as cdp:
        pass

asyncio.run(main())
```

#### Load client config from `.env` file

Another option is to save your CDP API Key and Wallet Secret in a `.env` file:

```bash
touch .env
echo "CDP_API_KEY_ID=YOUR_API_KEY_ID" >> .env
echo "CDP_API_KEY_SECRET=YOUR_API_KEY_SECRET" >> .env
echo "CDP_WALLET_SECRET=YOUR_WALLET_SECRET" >> .env
```

Then, load the client config from the `.env` file:

```python
from cdp import CdpClient
from dotenv import load_dotenv
import asyncio

load_dotenv()

async def main():
    async with CdpClient() as cdp:
        pass

asyncio.run(main())
```

#### Pass the API Key and Wallet Secret to the client

Another option is to directly pass the API Key and Wallet Secret to the client:

```python
import asyncio
from cdp import CdpClient

async def main():
    async with CdpClient(
        api_key_id="YOUR_API_KEY_ID",
        api_key_secret="YOUR_API_KEY_SECRET",
        wallet_secret="YOUR_WALLET_SECRET",
    ) as cdp:
        pass

asyncio.run(main())
```

### Creating EVM or Solana accounts

#### Create an EVM account as follows:

```python
import asyncio
from cdp import CdpClient

async def main():
    async with CdpClient() as cdp:
        account = await cdp.evm.create_account()

asyncio.run(main())
```

#### Create a Solana account as follows:

```python
import asyncio
from cdp import CdpClient

async def main():
    async with CdpClient() as cdp:
        account = await cdp.solana.create_account()

asyncio.run(main())
```

#### Get or create an EVM account as follows:

```python
import asyncio
from cdp import CdpClient

async def main():
    async with CdpClient() as cdp:
        account = await cdp.evm.get_or_create_account()

asyncio.run(main())
```

#### Get or create a Solana account as follows:

```python
import asyncio
from cdp import CdpClient

async def main():
    async with CdpClient() as cdp:
        account = await cdp.solana.get_or_create_account()

asyncio.run(main())
```

### Updating EVM or Solana accounts

#### Update an EVM account as follows:

```python
account = await cdp.evm.update_account(
  address=account.address,
  update=UpdateAccountOptions(
    name="Updated name",
    account_policy="1622d4b7-9d60-44a2-9a6a-e9bbb167e412",
  ),
)
```

#### Update a Solana account as follows:

```python
account = await cdp.solana.update_account(
  address=account.address,
  update=UpdateAccountOptions(
    name="Updated name",
    account_policy="1622d4b7-9d60-44a2-9a6a-e9bbb167e412",
  ),
)
```

### Testnet faucet

You can use the faucet function to request testnet ETH or SOL from the CDP.

#### Request testnet ETH as follows:

```python
import asyncio
from cdp import CdpClient

async def main():
    async with CdpClient() as cdp:
        await cdp.evm.request_faucet(
            address=evm_account.address, network="base-sepolia", token="eth"
        )

asyncio.run(main())
```

#### Request testnet SOL as follows:

```python
import asyncio
from cdp import CdpClient

async def main():
    async with CdpClient() as cdp:
        await cdp.solana.request_faucet(
            address=address, token="sol"
        )

asyncio.run(main())
```

### Sending transactions

#### EVM

You can use CDP SDK to send transactions on EVM networks. By default, Coinbase will manage the nonce and gas for you.

```python
import asyncio

from dotenv import load_dotenv
from web3 import Web3

from cdp import CdpClient
from cdp.evm_transaction_types import TransactionRequestEIP1559

w3 = Web3(Web3.HTTPProvider("https://sepolia.base.org"))


async def main():
    load_dotenv()

    async with CdpClient() as cdp:
        evm_account = await cdp.evm.create_account()

        faucet_hash = await cdp.evm.request_faucet(
            address=evm_account.address, network="base-sepolia", token="eth"
        )

        w3.eth.wait_for_transaction_receipt(faucet_hash)

        zero_address = "0x0000000000000000000000000000000000000000"

        amount_to_send = w3.to_wei(0.000001, "ether")

        tx_hash = await cdp.evm.send_transaction(
            address=evm_account.address,
            transaction=TransactionRequestEIP1559(
                to=zero_address,
                value=amount_to_send,
            ),
            network="base-sepolia",
        )

        print(f"Transaction sent! Hash: {tx_hash}")

        print("Waiting for transaction confirmation...")
        tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        print(f"Transaction confirmed in block {tx_receipt.blockNumber}")
        print(f"Transaction status: {'Success' if tx_receipt.status == 1 else 'Failed'}")


asyncio.run(main())
```

If you'd like to manage the nonce and gas yourself, you can do so as follows:

```python
import asyncio

from dotenv import load_dotenv
from web3 import Web3

from cdp import CdpClient
from cdp.evm_transaction_types import TransactionRequestEIP1559

w3 = Web3(Web3.HTTPProvider("https://sepolia.base.org"))


async def main():
    load_dotenv()

    async with CdpClient() as cdp:
        evm_account = await cdp.evm.create_account()

        faucet_hash = await cdp.evm.request_faucet(
            address=evm_account.address, network="base-sepolia", token="eth"
        )

        w3.eth.wait_for_transaction_receipt(faucet_hash)

        zero_address = "0x0000000000000000000000000000000000000000"

        amount_to_send = w3.to_wei(0.000001, "ether")

        nonce = w3.eth.get_transaction_count(evm_account.address)

        gas_estimate = w3.eth.estimate_gas(
            {"to": zero_address, "from": evm_account.address, "value": amount_to_send}
        )

        max_priority_fee = w3.eth.max_priority_fee
        max_fee = w3.eth.gas_price + max_priority_fee

        tx_hash = await cdp.evm.send_transaction(
            address=evm_account.address,
            transaction=TransactionRequestEIP1559(
                to=zero_address,
                value=amount_to_send,
                gas=gas_estimate,
                maxFeePerGas=max_fee,
                maxPriorityFeePerGas=max_priority_fee,
                nonce=nonce,
            ),
            network="base-sepolia",
        )

        print(f"Transaction sent! Hash: {tx_hash}")

        print("Waiting for transaction confirmation...")
        tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        print(f"Transaction confirmed in block {tx_receipt.blockNumber}")
        print(f"Transaction status: {'Success' if tx_receipt.status == 1 else 'Failed'}")


asyncio.run(main())
```

You can also use `DynamicFeeTransaction` from `eth-account`:

```python
import asyncio

from dotenv import load_dotenv
from web3 import Web3

from cdp import CdpClient
from eth_account.typed_transactions import DynamicFeeTransaction

w3 = Web3(Web3.HTTPProvider("https://sepolia.base.org"))


async def main():
    load_dotenv()

    async with CdpClient() as cdp:
        evm_account = await cdp.evm.create_account()

        faucet_hash = await cdp.evm.request_faucet(
            address=evm_account.address, network="base-sepolia", token="eth"
        )

        w3.eth.wait_for_transaction_receipt(faucet_hash)

        zero_address = "0x0000000000000000000000000000000000000000"

        amount_to_send = w3.to_wei(0.000001, "ether")

        nonce = w3.eth.get_transaction_count(evm_account.address)

        gas_estimate = w3.eth.estimate_gas(
            {"to": zero_address, "from": evm_account.address, "value": amount_to_send}
        )

        max_priority_fee = w3.eth.max_priority_fee
        max_fee = w3.eth.gas_price + max_priority_fee

        tx_hash = await cdp.evm.send_transaction(
            address=evm_account.address,
            transaction=DynamicFeeTransaction.from_dict(
                {
                "to": zero_address,
                "value": amount_to_send,
                "chainId": 84532,
                "gas": gas_estimate,
                "maxFeePerGas": max_fee,
                "maxPriorityFeePerGas": max_priority_fee,
                "nonce": nonce,
                "type": "0x2",
                }
            ),
            network="base-sepolia",
        )

        print(f"Transaction sent! Hash: {tx_hash}")

        print("Waiting for transaction confirmation...")
        tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        print(f"Transaction confirmed in block {tx_receipt.blockNumber}")
        print(f"Transaction status: {'Success' if tx_receipt.status == 1 else 'Failed'}")


asyncio.run(main())
```

#### Solana

For Solana, we recommend using the `solana` library to send transactions. See the [examples](https://github.com/coinbase/cdp-sdk/tree/main/examples/python/solana/send_transaction.py).

### Transferring tokens

#### EVM

For complete examples, check out [account.transfer.py](https://github.com/coinbase/cdp-sdk/blob/main/examples/python/evm/account.transfer.py) and [smart_account.transfer.py](https://github.com/coinbase/cdp-sdk/blob/main/examples/python/evm/smart_account.transfer.py).

You can transfer tokens between accounts using the `transfer` function:

```python
sender = await cdp.evm.create_account(name="Sender")

tx_hash = await sender.transfer(
    to="0x9F663335Cd6Ad02a37B633602E98866CF944124d",
    amount=w3.to_wei("0.001", "ether"),
    token="eth",
    network="base-sepolia",
)

w3.eth.wait_for_transaction_receipt(tx_hash)
```

To send USDC, the SDK exports a helper function to convert a whole number to a bigint:

```python
from cdp import parse_units

# returns atomic representation of 0.01 USDC, which uses 6 decimal places
amount = parse_units("0.01", 6)

tx_hash = await sender.transfer(
    to="0x9F663335Cd6Ad02a37B633602E98866CF944124d",
    amount=amount,
    token="usdc",
    network="base-sepolia",
)
```

Smart Accounts also have a `transfer` function:

```python
from cdp import parse_units

sender = await cdp.evm.create_smart_account(
    owner=privateKeyToAccount(generatePrivateKey()),
);
print("Created smart account", sender);

transfer_result = await sender.transfer(
    to="0x9F663335Cd6Ad02a37B633602E98866CF944124d",
    amount=parse_units("0.01", 6),
    token="usdc",
    network="base-sepolia",
)

user_op_result = await sender.wait_for_user_operation(user_op_hash=transfer_result.user_op_hash)
```

Using Smart Accounts, you can also specify a paymaster URL:

```python
transfer_result = await sender.transfer(
    to="0x9F663335Cd6Ad02a37B633602E98866CF944124d",
    amount="0.01",
    token="usdc",
    network="base-sepolia",
    paymaster_url="https://some-paymaster-url.com",
)
```

You can pass `usdc` or `eth` as the token to transfer, or you can pass a contract address directly:

```python
transfer_result = await sender.transfer(
    to="0x9F663335Cd6Ad02a37B633602E98866CF944124d",
    amount=w3.to_wei("0.000001", "ether"),
    token="0x4200000000000000000000000000000000000006", # WETH on Base Sepolia
    network="base-sepolia",
)
```

You can also pass another account as the `to` parameter:

```python
from cdp import parse_units

sender = await cdp.evm.create_account(name="Sender")
receiver = await cdp.evm.create_account(name="Receiver")

transfer_result = await sender.transfer(
    to=receiver,
    amount=parse_units("0.01", 6),
    token="usdc",
    network="base-sepolia",
)
```

#### Solana

For complete examples, check out [solana/account.transfer.py](https://github.com/coinbase/cdp-sdk/blob/main/examples/python/solana/account.transfer.py).

You can transfer tokens between accounts using the `transfer` function, and wait for the transaction to be confirmed using the `confirmTransaction` function from `solana`:

```python
import asyncio
from cdp import CdpClient
from solana.rpc.api import Client as SolanaClient

async def main():
    async with CdpClient() as cdp:
        sender = await cdp.solana.create_account()

        connection = SolanaClient("https://api.devnet.solana.com")

        signature = await sender.transfer({
            to="3KzDtddx4i53FBkvCzuDmRbaMozTZoJBb1TToWhz3JfE",
            amount=0.01 * LAMPORTS_PER_SOL,
            token="sol",
            network=connection,
        });

        blockhash, lastValidBlockHeight = await connection.get_latest_blockhash()

        confirmation = await connection.confirm_transaction(
            {
                signature,
                blockhash,
                lastValidBlockHeight,
            },
        )

        if confirmation.value.err:
            print(f"Something went wrong! Error: {confirmation.value.err.toString()}")
        else:
            print(
                f"Transaction confirmed: Link: https://explorer.solana.com/tx/${signature}?cluster=devnet",
            )
```

To send USDC, the SDK exports a helper function to convert a whole number to a bigint:

```python
from cdp import parse_units

# returns atomic representation of 0.01 USDC, which uses 6 decimal places
amount = parse_units("0.01", 6)

tx_hash = await sender.transfer(
    to="0x9F663335Cd6Ad02a37B633602E98866CF944124d",
    amount=amount,
    token="usdc",
    network="devet",
)
```

### EVM Smart Accounts

For EVM, we support Smart Accounts which are account-abstraction (ERC-4337) accounts. Currently there is only support for Base Sepolia and Base Mainnet for Smart Accounts.

#### Create an EVM account and a smart account as follows:

```python
import asyncio
from cdp import CdpClient

async def main():
    async with CdpClient() as cdp:
        evm_account = await cdp.evm.create_account()
        smart_account = await cdp.evm.create_smart_account(
            owner=evm_account
        )

asyncio.run(main())
```

#### Sending User Operations

```python
import asyncio
from cdp.evm_call_types import EncodedCall
from cdp import CdpClient

async def main():
    async with CdpClient() as cdp:
        user_operation = await cdp.evm.send_user_operation(
            smart_account=smart_account,
            network="base-sepolia",
            calls=[
                EncodedCall(
                    to="0x0000000000000000000000000000000000000000",
                    value=0,
                    data="0x"
                )
            ]
        )

asyncio.run(main())
```

#### In Base Sepolia, all user operations are gasless by default. If you'd like to specify a different paymaster, you can do so as follows:

```python
import asyncio
from cdp.evm_call_types import EncodedCall
from cdp import CdpClient

async def main():
    async with CdpClient() as cdp:
    user_operation = await cdp.evm.send_user_operation(
        smart_account=smart_account,
        network="base-sepolia",
        calls=[],
            paymaster_url="https://some-paymaster-url.com"
        )

asyncio.run(main())
```

## Account Actions

Account objects have actions that can be used to interact with the account. These can be used in place of the `cdp` client.

For example, instead of:

```python
token_balances = await cdp.evm.list_token_balances(
    address=account.address,
    network="base-sepolia"
)
```

You can use the `list_token_balances` action:

```python
balances = await account.list_token_balances(
    network="base-sepolia",
)
```

EvmAccount supports the following actions:

- `list_token_balances`
- `request_faucet`
- `sign_transaction`
- `send_transaction`
- `transfer`

EvmSmartAccount supports the following actions:

- `list_token_balances`
- `request_faucet`
- `send_user_operation`
- `wait_for_user_operation`
- `get_user_operation`
- `transfer`

SolanaAccount supports the following actions:

- `sign_message`
- `sign_transaction`
- `request_faucet`

## Policy Management

You can use the policies SDK to manage sets of rules that govern the behavior of accounts and projects, such as enforce allowlists and denylists.

### Create a Project-level policy that applies to all accounts

This policy will accept any account sending less than a specific amount of ETH to a specific address.

```python
policy = await cdp.policies.create_policy(
    policy=CreatePolicyOptions(
        scope="project",
        description="Project-wide Allowlist Example",
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
```

### Create an Account-level policy

This policy will accept any transaction with a value less than or equal to 1 ETH to a specific address.

```python
policy = await cdp.policies.create_policy(
    policy=CreatePolicyOptions(
        scope="account",
        description="Account Allowlist Example",
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
```

### Create a Solana Allowlist Policy

```python
policy = await cdp.policies.create_policy(
    policy=CreatePolicyOptions(
        scope="account",
        description="Account Allowlist Example",
        rules=[
            SignSolanaTransactionRule(
                action="accept",
                criteria=[
                    SolanaAddressCriterion(
                        addresses=["123456789abcdef123456789abcdef12"],
                        operator="in",
                    ),
                ],
            )
        ],
    )
)
```

### List Policies

You can filter by account:

```python
policies = await cdp.policies.list_policies(scope="account")
```

You can also filter by project:

```python
policies = await cdp.policies.list_policies(scope="project")
```

Or you can list all of them without any filter:

```python
policies = await cdp.policies.list_policies()
```

### Retrieve a Policy

```python
policies = await cdp.policies.get_policy_by_id(id="__POLICY_ID__")
```

### Update a Policy

This policy will update an existing policy to accept transactions to any address except one.

```python
policy = await cdp.policies.update_policy(
    id="__POLICY_ID__",
    policy=UpdatePolicyOptions(
        description="Updated Denylist Policy",
        rules=[
            SignEvmTransactionRule(
                action="accept",
                criteria=[
                    EvmAddressCriterion(
                        addresses=["0x000000000000000000000000000000000000dEaD"],
                        operator="not in",
                    ),
                ],
            )
        ],
    )
)
```

### Delete a Policy

> [!WARNING] Attempting to delete an account-level policy in-use by at least one account will fail.

```python
policy = await cdp.policies.delete_policy(id="__POLICY_ID__")
```

## Authentication tools

This SDK also contains simple tools for authenticating REST API requests to the [Coinbase Developer Platform (CDP)](https://docs.cdp.coinbase.com/). See the [Auth README](cdp/auth/README.md) for more details.

## Error Reporting

This SDK contains error reporting functionality that sends error events to the CDP. If you would like to disable this behavior, you can set the `DISABLE_CDP_ERROR_REPORTING` environment variable to `true`.

```bash
DISABLE_CDP_ERROR_REPORTING=true
```

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/coinbase/cdp-sdk/tree/main/LICENSE.md) file for details.

## Support

For feature requests, feedback, or questions, please reach out to us in the
**#cdp-sdk** channel of the [Coinbase Developer Platform Discord](https://discord.com/invite/cdp).

- [API Reference](https://docs.cdp.coinbase.com/api-v2/docs/welcome)
- [SDK Docs](https://coinbase.github.io/cdp-sdk/python)
- [GitHub Issues](https://github.com/coinbase/cdp-sdk/issues)

## Security

If you discover a security vulnerability within this SDK, please see our [Security Policy](https://github.com/coinbase/cdp-sdk/tree/main/SECURITY.md) for disclosure information.
