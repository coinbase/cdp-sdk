# Coinbase Developer Platform (CDP) Python SDK

## Table of Contents

- [CDP SDK](#cdp-sdk)
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

This module contains the Python CDP SDK, which is a library that provides a client for interacting with the [Coinbase Developer Platform (CDP)](https://docs.cdp.coinbase.com/). It includes a CDP Client for interacting with EVM and Solana APIs to create accounts and send transactions, as well as authentication tools for interacting directly with the CDP APIs.

## Installation

```bash
pip install cdp-sdk
```

## API Keys

To start, [create a CDP API Key](https://portal.cdp.coinbase.com/access/api). Save the `API Key ID` and `API Key Secret` for use in the SDK. You will also need to create a wallet secret in the Portal to sign transactions.

## Usage

### Initialization

#### You can import the SDK as follows:

```python
from cdp import CdpClient
```

#### Then, initialize the client as follows:

```python
cdp = CdpClient(
    api_key_id="YOUR_API_KEY_ID",
    api_key_secret="YOUR_API_KEY_SECRET",
    wallet_secret="YOUR_WALLET_SECRET",
)
```

### Creating EVM or Solana accounts

#### Create an EVM account as follows:

```python
evm_account = await cdp.evm.create_account()
```

#### Create a Solana account as follows:

```python
solana_account = await cdp.solana.create_account()
```

### Testnet faucet

You can use the faucet function to request testnet ETH or SOL from the CDP.

#### Request testnet ETH as follows:

```python
await cdp.evm.request_faucet(
    address=evm_account.address, network="base-sepolia", token="eth"
)
```

#### Request testnet SOL as follows:

```python
await cdp.solana.request_faucet(
    address=address, token="sol"
)
```

### Sending transactions

For EVM, we recommend using viem to send transactions. See the [examples](https://github.com/coinbase/cdp-sdk/tree/main/python/cdp/examples/send_evm_tx.py).
For Solana, we recommend using the `@solana/web3.js` library to send transactions. See the [examples](https://github.com/coinbase/cdp-sdk/tree/main/python/cdp/examples/send_sol_tx.py).

### EVM Smart Accounts

For EVM, we support Smart Accounts which are account-abstraction (ERC-4337) accounts. Currently there is only support for Base Sepolia and Base Mainnet for Smart Accounts.

#### Create an EVM account and a smart account as follows:

```python
evm_account = await cdp.evm.create_account()
smart_account = await cdp.evm.create_smart_account(
    owner=evm_account
)
```

#### Sending User Operations

```python
user_operation = await cdp.evm.send_user_operation(
    smart_account=smart_account,
    network="base-sepolia",
    calls=[
        {
            "to": "0x0000000000000000000000000000000000000000",
            "value": 10000000000000000,
            "data": "0x"
        }
    ]
)
```

#### In Base Sepolia, all user operations are gasless by default. If you'd like to specify a different paymaster, you can do so as follows:

```python
user_operation = await cdp.evm.send_user_operation(
    smart_account=smart_account,
    network="base-sepolia",
    calls=[],
    paymaster_url="https://some-paymaster-url.com"
)
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
