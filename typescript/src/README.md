# Coinbase Developer Platform (CDP) TypeScript SDK

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
> If you're looking to contribute to the SDK, please see the [Contributing Guide](https://github.com/coinbase/cdp-sdk/blob/main/typescript/CONTRIBUTING.md).

## CDP SDK

This module contains the TypeScript CDP SDK, which is a library that provides a client for interacting with the [Coinbase Developer Platform (CDP)](https://docs.cdp.coinbase.com/). It includes a CDP Client for interacting with EVM and Solana APIs to create accounts and send transactions, as well as authentication tools for interacting directly with the CDP APIs.

## Installation

```bash
npm install @coinbase/cdp-sdk
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

```typescript
import { CdpClient } from "@coinbase/cdp-sdk";

const cdp = new CdpClient();
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

```typescript
import { CdpClient } from "@coinbase/cdp-sdk";
import dotenv from "dotenv";

dotenv.config();

const cdp = new CdpClient();
```

#### Pass the API Key and Wallet Secret to the client

Another option is to directly pass the API Key and Wallet Secret to the client:

```typescript
const cdp = new CdpClient({
  apiKeyId: "YOUR_API_KEY_ID",
  apiKeySecret: "YOUR_API_KEY_SECRET",
  walletSecret: "YOUR_WALLET_SECRET",
});
```

### Creating EVM or Solana accounts

#### Create an EVM account as follows:

```typescript
const evmAccount = await cdp.evm.createAccount();
```

#### Create a Solana account as follows:

```typescript
const solanaAccount = await cdp.solana.createAccount();
```

### Testnet faucet

You can use the faucet function to request testnet ETH or SOL from the CDP.

#### Request testnet ETH as follows:

```typescript
const faucetResp = await cdp.evm.requestFaucet({
  address: evmAccount.address,
  network: "base-sepolia",
  token: "eth",
});
```

#### Request testnet SOL as follows:

```typescript
const faucetResp = await cdp.solana.requestFaucet({
  address: fromAddress,
  token: "sol",
});
```

### Sending transactions

#### EVM

You can use CDP SDK to send transactions on EVM networks.

```typescript
import { CdpClient } from "@coinbase/cdp-sdk";
import { parseEther, createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

const cdp = new CdpClient();

const account = await cdp.evm.createAccount();

const faucetResp = await cdp.evm.requestFaucet({
  address: account.address,
  network: "base-sepolia",
  token: "eth",
});

const faucetTxReceipt = await publicClient.waitForTransactionReceipt({
  hash: faucetResp.transactionHash,
});

const { transactionHash } = await cdp.evm.sendTransaction({
  address: account.address,
  network: "base-sepolia",
  transaction: {
    to: "0x4252e0c9A3da5A2700e7d91cb50aEf522D0C6Fe8",
    value: parseEther("0.000001"),
  },
});

await publicClient.waitForTransactionReceipt({ hash: transactionHash });

console.log(
  `Transaction confirmed! Explorer link: https://sepolia.basescan.org/tx/${transactionHash}`,
);
```

CDP SDK is fully viem-compatible, so you can optionally use a `walletClient` to send transactions.

```typescript
import { CdpClient } from "@coinbase/cdp-sdk";
import { parseEther, createPublicClient, http, createWalletClient, toAccount } from "viem";
import { baseSepolia } from "viem/chains";

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

const cdp = new CdpClient();

const account = await cdp.evm.createAccount();

const faucetResp = await cdp.evm.requestFaucet({
  address: account.address,
  network: "base-sepolia",
  token: "eth",
});

const faucetTxReceipt = await publicClient.waitForTransactionReceipt({
  hash: faucetResp.transactionHash,
});

const walletClient = createWalletClient({
  account: toAccount(serverAccount),
  chain: baseSepolia,
  transport: http(),
});

// Step 3: Sign the transaction with CDP and broadcast it using the wallet client.
const hash = await walletClient.sendTransaction({
  to: "0x4252e0c9A3da5A2700e7d91cb50aEf522D0C6Fe8",
  value: parseEther("0.000001"),
});

console.log(`Transaction confirmed! Explorer link: https://sepolia.basescan.org/tx/${hash}`);
```

#### Solana

For Solana, we recommend using the `@solana/web3.js` library to send transactions. See the [examples](https://github.com/coinbase/cdp-sdk/tree/main/typescript/src/examples/solana/signAndSendTransaction.ts).

### EVM Smart Accounts

For EVM, we support Smart Accounts which are account-abstraction (ERC-4337) accounts. Currently there is only support for Base Sepolia and Base Mainnet for Smart Accounts.

#### Create an EVM account and a smart account as follows:

```typescript
const evmAccount = await cdp.evm.createAccount();
const smartAccount = await cdp.evm.createSmartAccount({
  owner: evmAccount,
});
```

#### Sending User Operations

```typescript
const userOperation = await cdp.evm.sendUserOperation({
  smartAccount: smartAccount,
  network: "base-sepolia",
  calls: [
    {
      to: "0x0000000000000000000000000000000000000000",
      value: parseEther("0.000001"),
      data: "0x",
    },
  ],
});
```

#### In Base Sepolia, all user operations are gasless by default. If you'd like to specify a different paymaster, you can do so as follows:

```typescript
const userOperation = await cdp.sendUserOperation({
  smartAccount: smartAccount,
  network: "base-sepolia",
  calls: [
    {
      to: "0x0000000000000000000000000000000000000000",
      value: parseEther("0"),
      data: "0x",
    },
  ],
  paymasterUrl: "https://some-paymaster-url.com",
});
```

## Authentication tools

This SDK also contains simple tools for authenticating REST API requests to the [Coinbase Developer Platform (CDP)](https://docs.cdp.coinbase.com/). See the [Auth README](src/auth/README.md) for more details.

## Error Reporting

This SDK contains error reporting functionality that sends error events to the CDP. If you would like to disable this behavior, you can set the `DISABLE_CDP_ERROR_REPORTING` environment variable to `true`.

```bash
DISABLE_CDP_ERROR_REPORTING=true
```

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/coinbase/cdp-sdk/tree/main/LICENSE.md) file for details.

## Support

For feature requests, feedback, or questions, please reach out to us in the **#cdp-sdk** channel of the [Coinbase Developer Platform Discord](https://discord.com/invite/cdp).

- [API Reference](https://docs.cdp.coinbase.com/api-v2/docs/welcome)
- [SDK Docs](https://coinbase.github.io/cdp-sdk/typescript)
- [GitHub Issues](https://github.com/coinbase/cdp-sdk/issues)

## Security

If you discover a security vulnerability within this SDK, please see our [Security Policy](https://github.com/coinbase/cdp-sdk/tree/main/SECURITY.md) for disclosure information.
