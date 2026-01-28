# Coinbase Developer Platform (CDP) TypeScript SDK

## Table of Contents

- [CDP SDK](#cdp-sdk)
- [Documentation](#documentation)
- [Installation](#installation)
- [API Keys](#api-keys)
- [Usage](#usage)
  - [Initialization](#initialization)
  - [Creating Accounts](#creating-evm-or-solana-accounts)
  - [Updating Accounts](#updating-evm-or-solana-accounts)
  - [Testnet Faucet](#testnet-faucet)
  - [Sending Transactions](#sending-transactions)
  - [EVM Smart Accounts](#evm-smart-accounts)
  - [EVM Swaps](#evm-swaps)
  - [Transferring Tokens](#transferring-tokens)
  - [Account Actions](#account-actions)
- [Policy Management](#policy-management)
- [End-user Management](#end-user-management)
  - [Create End User](#create-end-user)
  - [Import End User](#import-end-user)
  - [Add EVM Account to End User](#add-evm-account-to-end-user)
  - [Add EVM Smart Account to End User](#add-evm-smart-account-to-end-user)
  - [Add Solana Account to End User](#add-solana-account-to-end-user)
  - [Validate Access Token](#validate-access-token)
- [Authentication tools](#authentication-tools)
- [Error Reporting](#error-reporting)
- [Usage Tracking](#usage-tracking)
- [License](#license)
- [Support](#support)
- [Security](#security)
- [FAQ](#faq)

> [!TIP]
>
> If you're looking to contribute to the SDK, please see the [Contributing Guide](https://github.com/coinbase/cdp-sdk/blob/main/typescript/CONTRIBUTING.md).

## CDP SDK

This module contains the TypeScript CDP SDK, which is a library that provides a client for interacting with the [Coinbase Developer Platform (CDP)](https://docs.cdp.coinbase.com/). It includes a CDP Client for interacting with EVM and Solana APIs to create accounts and send transactions, policy APIs to govern transaction permissions, as well as authentication tools for interacting directly with the CDP APIs.

## Documentation

CDP SDK has [auto-generated docs for the Typescript SDK](https://coinbase.github.io/cdp-sdk/typescript).

Further documentation is also available on the CDP docs website:

- [Wallet API v2](https://docs.cdp.coinbase.com/wallet-api-v2/docs/welcome)
- [API Reference](https://docs.cdp.coinbase.com/api-v2/docs/welcome)

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

### Client Lifecycle

The CDP client wraps an HTTP client (Axios) and should be created once and reused throughout your application's lifecycle. The underlying HTTP client handles connection pooling automatically, so there's no need to recreate the client per request—doing so would be less efficient.

- **Long-lived services**: Create a single client instance at startup
- **Serverless/request-based runtimes**: Create once per cold start, or use a module-level singleton
- **Concurrency**: The client is safe to use across concurrent async operations

### Creating EVM or Solana accounts

#### Create an EVM account as follows:

```typescript
const account = await cdp.evm.createAccount();
```

#### Import an EVM account as follows:

```typescript
const account = await cdp.evm.importAccount({
  privateKey: "0x123456",
  name: "MyAccount",
});
```

#### Create a Solana account as follows:

```typescript
const account = await cdp.solana.createAccount();
```

#### Import a Solana account as follows:
```typescript
const account = await cdp.solana.importAccount({
  privateKey: "3MLZ...Uko8zz",
  name: "MyAccount",
});
```

### Exporting EVM or Solana accounts

#### Export an EVM account as follows:

```typescript
// by name
const privateKey = await cdp.evm.exportAccount({
  name: "MyAccount",
});

// by address
const privateKey = await cdp.evm.exportAccount({
  address: "0x123",
});
```

#### Export a Solana account as follows:

```typescript
// by name
const privateKey = await cdp.solana.exportAccount({
  name: "MyAccount",
});

// by address
const privateKey = await cdp.solana.exportAccount({
  address: "Abc",
});
```

#### Get or Create an EVM account as follows:

```typescript
const account = await cdp.evm.getOrCreateAccount({
  name: "Account1",
});
```

#### Get or Create a Solana account as follows:

```typescript
const account = await cdp.solana.getOrCreateAccount({
  name: "Account1",
});
```

#### Get or Create a Smart Account as follows:
```typescript
const owner = await cdp.evm.createAccount();
const account = await cdp.evm.getOrCreateSmartAccount({
  name: "Account1",
  owner
});
```

### Creating EVM or Solana accounts with policies

#### Create an EVM account with policy as follows:

```typescript
const account = await cdp.evm.createAccount({
  name: "AccountWithPolicy",
  accountPolicy: "abcdef12-3456-7890-1234-567890123456"
})
```

#### Create a Solana account with policy as follows:

```typescript
const account = await cdp.solana.createAccount({
  name: "AccountWithPolicy",
  accountPolicy: "abcdef12-3456-7890-1234-567890123456"
})
```

### Updating EVM or Solana accounts

#### Update an EVM account as follows:

```typescript
const account = await cdp.evm.updateAccount({
  addresss: account.address,
  update: {
    name: "Updated name",
    accountPolicy: "1622d4b7-9d60-44a2-9a6a-e9bbb167e412",
  },
});
```

#### Update a Solana account as follows:

```typescript
const account = await cdp.solana.updateAccount({
  addresss: account.address,
  update: {
    name: "Updated name",
    accountPolicy: "1622d4b7-9d60-44a2-9a6a-e9bbb167e412",
  },
});
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

You can use CDP SDK to send transactions on Solana.

For complete examples, check out [sendTransaction.ts](https://github.com/coinbase/cdp-sdk/blob/main/examples/typescript/solana/sendTransaction.ts), [sendManyTransactions.ts](https://github.com/coinbase/cdp-sdk/blob/main/examples/typescript/solana/sendManyTransactions.ts), and [sendManyBatchedTransactions.ts](https://github.com/coinbase/cdp-sdk/blob/main/examples/typescript/solana/sendManyBatchedTransactions.ts).

```typescript
import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

import {
  PublicKey,
  SystemProgram,
  SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
  Transaction,
} from "@solana/web3.js";

const cdp = new CdpClient();

const account = await cdp.solana.createAccount();

const faucetResp = await cdp.solana.requestFaucet({
  address: account.address,
  token: "sol",
});

const transaction = new Transaction();
transaction.add(
  SystemProgram.transfer({
    fromPubkey: new PublicKey(account.address),
    toPubkey: new PublicKey("3KzDtddx4i53FBkvCzuDmRbaMozTZoJBb1TToWhz3JfE"),
    lamports: 10000,
  })
);

// A more recent blockhash is set in the backend by CDP
transaction.recentBlockhash = SYSVAR_RECENT_BLOCKHASHES_PUBKEY.toBase58();
transaction.feePayer = new PublicKey(account.address);

const serializedTx = Buffer.from(
  transaction.serialize({ requireAllSignatures: false })
).toString("base64");

console.log("Transaction serialized successfully");

const txResult = await cdp.solana.sendTransaction({
  network: "solana-devnet",
  transaction: serializedTx,
});

console.log(
  `Transaction confirmed! Explorer link: https://explorer.solana.com/tx/${txResult.signature}?cluster=devnet`
);
```

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

### EVM Swaps

You can use the CDP SDK to swap tokens on EVM networks using both regular accounts (EOAs) and smart accounts.

The SDK provides three approaches for performing token swaps:

#### 1. All-in-one pattern (Recommended)

The simplest approach for performing swaps. Creates and executes the swap in a single line of code:

**Regular Account (EOA):**
```typescript
// Retrieve an existing EVM account with funds already in it
const account = await cdp.evm.getOrCreateAccount({ name: "MyExistingFundedAccount" });

// Execute a swap directly on an EVM account in one line
const { transactionHash } = await account.swap({
  network: "base",
  toToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
  fromToken: "0x4200000000000000000000000000000000000006", // WETH on Base
  fromAmount: BigInt("1000000000000000000"), // 1 WETH in wei
  slippageBps: 100, // 1% slippage tolerance
});

console.log(`Swap executed: ${transactionHash}`);
```

**Smart Account:**
```typescript
// Create or retrieve a smart account with funds already in it
const owner = await cdp.evm.getOrCreateAccount({ name: "MyOwnerAccount" });
const smartAccount = await cdp.evm.getOrCreateSmartAccount({ name: "MyExistingFundedSmartAccount", owner });

// Execute a swap directly on a smart account in one line
const { userOpHash } = await smartAccount.swap({
  network: "base",
  toToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
  fromToken: "0x4200000000000000000000000000000000000006", // WETH on Base
  fromAmount: BigInt("1000000000000000000"), // 1 WETH in wei
  slippageBps: 100, // 1% slippage tolerance
  // Optional: paymasterUrl: "https://paymaster.example.com" // For gas sponsorship
});

console.log(`Smart account swap executed: ${userOpHash}`);

// Wait for the user operation to complete
const receipt = await smartAccount.waitForUserOperation({ userOpHash });
console.log(`Status: ${receipt.status}`);
```

#### 2. Get pricing information

Use `getSwapPrice` for quick price estimates and display purposes. This is ideal for showing exchange rates without committing to a swap:

```typescript
const swapPrice = await cdp.evm.getSwapPrice({
  network: "ethereum",
  toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
  fromToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
  fromAmount: BigInt("1000000000000000000"), // 1 WETH in wei
  taker: "0x1234567890123456789012345678901234567890"
});

if (swapPrice.liquidityAvailable) {
  console.log(`You'll receive: ${swapPrice.toAmount} USDC`);
  console.log(`Minimum after slippage: ${swapPrice.minToAmount} USDC`);
}
```

**Note:** `getSwapPrice` does not reserve funds or signal commitment to swap, making it suitable for more frequent price updates with less strict rate limiting - although the data may be slightly less precise.

#### 3. Create and execute separately

Use `account.quoteSwap()` / `smartAccount.quoteSwap()` when you need full control over the swap process. This returns complete transaction data for execution:

**Important:** `quoteSwap()` signals a soft commitment to swap and may reserve funds on-chain. It is rate-limited more strictly than `getSwapPrice` to prevent abuse.

**Regular Account (EOA):**
```typescript
// Retrieve an existing EVM account with funds already in it
const account = await cdp.evm.getOrCreateAccount({ name: "MyExistingFundedAccount" });

// Step 1: Create a swap quote with full transaction details
const swapQuote = await account.quoteSwap({
  network: "base",
  toToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
  fromToken: "0x4200000000000000000000000000000000000006", // WETH
  fromAmount: BigInt("1000000000000000000"), // 1 WETH in wei
  slippageBps: 100, // 1% slippage tolerance
});

// Step 2: Check if liquidity is available, and/or perform other analysis on the swap quote
if (!swapQuote.liquidityAvailable) {
  console.error("Insufficient liquidity for swap");
  return;
}

// Step 3: Execute using the quote
const { transactionHash } = await swapQuote.execute();
```

**Smart Account:**
```typescript
// Create or retrieve a smart account with funds already in it
const owner = await cdp.evm.getOrCreateAccount({ name: "MyOwnerAccount" });
const smartAccount = await cdp.evm.getOrCreateSmartAccount({ name: "MyExistingFundedSmartAccount", owner });

// Step 1: Create a swap quote with full transaction details for smart account
const swapQuote = await smartAccount.quoteSwap({
  network: "base",
  toToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
  fromToken: "0x4200000000000000000000000000000000000006", // WETH
  fromAmount: BigInt("1000000000000000000"), // 1 WETH in wei
  slippageBps: 100, // 1% slippage tolerance
});

// Step 2: Check if liquidity is available, and/or perform other analysis on the swap quote
if (!swapQuote.liquidityAvailable) {
  console.error("Insufficient liquidity for swap");
  return;
}

// Step 3: Execute using the quote
const { userOpHash } = await swapQuote.execute();

// Wait for the user operation to complete
const receipt = await smartAccount.waitForUserOperation({ userOpHash });
console.log(`Status: ${receipt.status}`);
```

#### When to use each approach:

- **All-in-one (`account.swap()` / `smartAccount.swap()`)**: Best for most use cases. Simple, handles everything automatically.
- **Price only (`getSwapPrice`)**: For displaying exchange rates, building price calculators, or checking liquidity without executing. Suitable when frequent price updates are needed - although the data may be slightly less precise.
- **Create then execute (`account.quoteSwap()` / `smartAccount.quoteSwap()`)**: When you need to inspect swap details, implement custom logic, or handle complex scenarios before execution. Note: May reserve funds on-chain and is more strictly rate-limited.

#### Key differences between Regular Accounts (EOAs) and Smart Accounts:

- **Regular accounts (EOAs)** return `transactionHash` and execute immediately on-chain
- **Smart accounts** return `userOpHash` and execute via user operations with optional gas sponsorship through paymasters
- **Smart accounts** require an owner account for signing operations
- **Smart accounts** support batch operations and advanced account abstraction features

All approaches handle Permit2 signatures automatically for ERC20 token swaps. Make sure tokens have proper allowances set for the Permit2 contract before swapping.

#### Example implementations

To help you get started with token swaps in your application, we provide the following fully-working examples demonstrating different scenarios:

**Regular account (EOA) swap examples:**
- [Execute a swap transaction using account (RECOMMENDED)](https://github.com/coinbase/cdp-sdk/blob/main/examples/typescript/evm/swaps/account.swap.ts) - All-in-one regular account swap execution
- [Quote swap using account convenience method](https://github.com/coinbase/cdp-sdk/blob/main/examples/typescript/evm/swaps/account.quoteSwap.ts) - Account convenience method for creating quotes
- [Two-step quote and execute process](https://github.com/coinbase/cdp-sdk/blob/main/examples/typescript/evm/swaps/account.quoteSwapAndExecute.ts) - Detailed two-step approach with analysis
- [Swap with network hoisting](https://github.com/coinbase/cdp-sdk/blob/main/examples/typescript/evm/swaps/account.swapWithNetworkHoisting.ts) - All-in-one swap and two-step approach swap for EVM chains

**Smart account swap examples:**
- [Execute a swap transaction using smart account (RECOMMENDED)](https://github.com/coinbase/cdp-sdk/blob/main/examples/typescript/evm/smart-accounts/swap.ts) - All-in-one smart account swap execution with user operations and optional paymaster support
- [Quote swap using smart account convenience method](https://github.com/coinbase/cdp-sdk/blob/main/examples/typescript/evm/smart-accounts/smartAccount.quoteSwap.ts) - Smart account convenience method for creating quotes
- [Two-step quote and execute process](https://github.com/coinbase/cdp-sdk/blob/main/examples/typescript/evm/smart-accounts/smartAccount.quoteSwapAndExecute.ts) - Detailed two-step approach with analysis
- [Smart account swap with network hoisting](https://github.com/coinbase/cdp-sdk/blob/main/examples/typescript/evm/swaps/smartAccount.swapWithNetworkHoisting.ts) - All-in-one smart account swap and two-step approach smart account swap for EVM chains

**BYO wallet (viem) regular account (EOA) swap examples:**
- [Execute a swap transaction using viem account](https://github.com/coinbase/cdp-sdk/blob/main/examples/typescript/evm/viem.account.swap.ts) - All-in-one swap execution with viem wallets
- [Two-step quote and execute process using viem account](https://github.com/coinbase/cdp-sdk/blob/main/examples/typescript/evm/viem.account.quoteSwapAndExecute.ts) - Detailed two-step approach with viem wallets

**BYO wallet (viem + account abstraction) smart account swap examples:**
- [Execute a swap transaction using viem smart account](https://github.com/coinbase/cdp-sdk/blob/main/examples/typescript/evm/viem.smartAccount.swap.ts) - All-in-one smart account swap with custom bundler/paymaster setup
- [Two-step quote and execute process using viem smart account](https://github.com/coinbase/cdp-sdk/blob/main/examples/typescript/evm/viem.smartAccount.quoteSwapAndExecute.ts) - Advanced account abstraction integration

**Note:** The viem smart account examples require additional dependencies (`permissionless` package) and external service setup (bundler, optional paymaster). For simpler smart account usage, consider CDP's built-in smart account features instead.

### Transferring tokens

#### EVM

For complete examples, check out [evm/account.transfer.ts](https://github.com/coinbase/cdp-sdk/blob/main/examples/typescript/evm/account.transfer.ts) and [evm/smartAccount.transfer.ts](https://github.com/coinbase/cdp-sdk/blob/main/examples/typescript/evm/smartAccount.transfer.ts).

You can transfer tokens between accounts using the `transfer` function:

```typescript
const sender = await cdp.evm.createAccount({ name: "Sender" });

const { transactionHash } = await sender.transfer({
  to: "0x9F663335Cd6Ad02a37B633602E98866CF944124d",
  amount: 10000n, // equivalent to 0.01 USDC
  token: "usdc",
  network: "base-sepolia",
});
```

You can then [wait for the transaction receipt with a viem Public Client](https://viem.sh/docs/actions/public/waitForTransactionReceipt#waitfortransactionreceipt):

```typescript
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

const receipt = await publicClient.waitForTransactionReceipt({ hash: transactionHash });
```

Smart Accounts also have a `transfer` function:

```typescript
const sender = await cdp.evm.createSmartAccount({
  owner: privateKeyToAccount(generatePrivateKey()),
});
console.log("Created smart account", sender);

const { userOpHash } = await sender.transfer({
  to: "0x9F663335Cd6Ad02a37B633602E98866CF944124d",
  amount: 10000n, // equivalent to 0.01 USDC
  token: "usdc",
  network: "base-sepolia",
});
```

One difference is that the `transfer` function returns the user operation hash, which is different from the transaction hash. You can use the returned user operation hash in a call to `waitForUserOperation` to get the result of the transaction:

```typescript
const receipt = await sender.waitForUserOperation({
  hash: userOpHash,
});

if (receipt.status === "complete") {
  console.log(
    `Transfer successful! Explorer link: https://sepolia.basescan.org/tx/${receipt.userOpHash}`,
  );
} else {
  console.log(`Something went wrong! User operation hash: ${receipt.userOpHash}`);
}
```

Using Smart Accounts, you can also specify a paymaster URL:

```typescript
await sender.transfer({
  to: "0x9F663335Cd6Ad02a37B633602E98866CF944124d",
  amount: "0.01",
  token: "usdc",
  network: "base-sepolia",
  paymasterUrl: "https://some-paymaster-url.com",
});
```

Transfer amount must be passed as a bigint. To convert common tokens from whole units, you can use utilities such as [`parseEther`](https://viem.sh/docs/utilities/parseEther#parseether) and [`parseUnits`](https://viem.sh/docs/utilities/parseUnits#parseunits) from viem.

```typescript
await sender.transfer({
  to: "0x9F663335Cd6Ad02a37B633602E98866CF944124d",
  amount: parseUnits("0.01", 6), // USDC has 6 decimals
  token: "usdc",
  network: "base-sepolia",
});
```

You can pass `usdc` or `eth` as the token to transfer, or you can pass a contract address directly:

```typescript
await sender.transfer({
  to: "0x9F663335Cd6Ad02a37B633602E98866CF944124d",
  amount: parseUnits("0.000001", 18), // WETH has 18 decimals. equivalent to calling `parseEther("0.000001")`
  token: "0x4200000000000000000000000000000000000006", // WETH on Base Sepolia
  network: "base-sepolia",
});
```

You can also pass another account as the `to` parameter:

```typescript
const sender = await cdp.evm.createAccount({ name: "Sender" });

const receiver = await cdp.evm.createAccount({ name: "Receiver" });

await sender.transfer({
  to: receiver,
  amount: 10000n, // equivalent to 0.01 USDC
  token: "usdc",
  network: "base-sepolia",
});
```
#### Solana

For complete examples, check out [solana/account.transfer.ts](https://github.com/coinbase/cdp-sdk/blob/main/examples/typescript/solana/account.transfer.ts).

You can transfer tokens between accounts using the `transfer` function, and wait for the transaction to be confirmed using the `confirmTransaction` function from `@solana/web3.js`:

```typescript
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

const sender = await cdp.solana.createAccount();

const connection = new Connection("https://api.devnet.solana.com");

const { signature } = await sender.transfer({
  to: "3KzDtddx4i53FBkvCzuDmRbaMozTZoJBb1TToWhz3JfE",
  amount: 0.01 * LAMPORTS_PER_SOL,
  token: "sol",
  network: connection,
});

const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

const confirmation = await connection.confirmTransaction(
  {
    signature,
    blockhash,
    lastValidBlockHeight,
  },
  "confirmed",
);

if (confirmation.value.err) {
  console.log(`Something went wrong! Error: ${confirmation.value.err.toString()}`);
} else {
  console.log(
    `Transaction confirmed: Link: https://explorer.solana.com/tx/${signature}?cluster=devnet`,
  );
}
```

You can also easily send USDC:

```typescript
const { signature } = await sender.transfer({
  to: "3KzDtddx4i53FBkvCzuDmRbaMozTZoJBb1TToWhz3JfE",
  amount: "0.01",
  token: "usdc",
  network: "devnet",
});
```

If you want to use your own Connection, you can pass one to the `network` parameter:

```typescript
import { Connection } from "@solana/web3.js";

const connection = new Connection("YOUR_RPC_URL");

const { signature } = await sender.transfer({
  to: "3KzDtddx4i53FBkvCzuDmRbaMozTZoJBb1TToWhz3JfE",
  amount: "0.01",
  token: "usdc",
  network: connection,
});
```

## Account Actions

Account objects have actions that can be used to interact with the account. These can be used in place of the `cdp` client.

### EVM account actions

Here are some examples for actions on EVM accounts.

For example, instead of:

```typescript
const balances = await cdp.evm.listTokenBalances({
  address: account.address,
  network: "base-sepolia",
});
```

You can use the `listTokenBalances` action:

```typescript
const account = await cdp.evm.createAccount();
const balances = await account.listTokenBalances({ network: "base-sepolia" });
```

EvmAccount supports the following actions:

- `listTokenBalances`
- `requestFaucet`
- `signTransaction`
- `sendTransaction`
- `transfer`

EvmSmartAccount supports the following actions:

- `listTokenBalances`
- `requestFaucet`
- `sendUserOperation`
- `waitForUserOperation`
- `getUserOperation`
- `transfer`

### Solana account actions

Here are some examples for actions on Solana accounts.

```typescript
const balances = await cdp.solana.signMessage({
  address: account.address,
  message: "Hello, world!",
});
```

You can use the `signMessage` action:

```typescript
const account = await cdp.solana.createAccount();
const { signature } = await account.signMessage({
  message: "Hello, world!",
});
```

SolanaAccount supports the following actions:

- `requestFaucet`
- `signMessage`
- `signTransaction`

## Policy Management

You can use the policies SDK to manage sets of rules that govern the behavior of accounts and projects, such as enforce allowlists and denylists.

### Create a Project-level policy that applies to all accounts

This policy will accept any account sending less than a specific amount of ETH to a specific address.

```typescript
const policy = await cdp.policies.createPolicy({
  policy: {
    scope: "project",
    description: "Project-wide Allowlist Policy",
    rules: [
      {
        action: "accept",
        operation: "signEvmTransaction",
        criteria: [
          {
            type: "ethValue",
            ethValue: "1000000000000000000",
            operator: "<=",
          },
          {
            type: "evmAddress",
            addresses: ["0x000000000000000000000000000000000000dEaD"],
            operator: "in",
          },
        ],
      },
    ],
  },
});
```

### Create an Account-level policy

This policy will accept any transaction with a value less than or equal to 1 ETH to a specific address.

```typescript
const policy = await cdp.policies.createPolicy({
  policy: {
    scope: "account",
    description: "Account Allowlist Policy",
    rules: [
      {
        action: "accept",
        operation: "signEvmTransaction",
        criteria: [
          {
            type: "ethValue",
            ethValue: "1000000000000000000",
            operator: "<=",
          },
          {
            type: "evmAddress",
            addresses: ["0x000000000000000000000000000000000000dEaD"],
            operator: "in",
          },
        ],
      },
    ],
  },
});
```

### Create a Solana Allowlist Policy

```typescript
const policy = await cdp.policies.createPolicy({
  policy: {
    scope: "account",
    description: "Account Allowlist Policy",
    rules: [
      {
        action: "accept",
        operation: "signSolTransaction",
        criteria: [
          {
            type: "solAddress",
            addresses: ["DtdSSG8ZJRZVv5Jx7K1MeWp7Zxcu19GD5wQRGRpQ9uMF"],
            operator: "in",
          },
        ],
      },
    ],
  },
});
```

### List Policies

You can filter by account:

```typescript
const policy = await cdp.policies.listPolicies({
  scope: "account",
});
```

You can also filter by project:

```typescript
const policy = await cdp.policies.listPolicies({
  scope: "project",
});
```

### Retrieve a Policy

```typescript
const policy = await cdp.policies.getPolicyById({
  id: "__POLICY_ID__",
});
```

### Update a Policy

This policy will update an existing policy to accept transactions to any address except one.

```typescript
const policy = await cdp.policies.updatePolicy({
  id: "__POLICY_ID__",
  policy: {
    description: "Updated Account Denylist Policy",
    rules: [
      {
        action: "accept",
        operation: "signEvmTransaction",
        criteria: [
          {
            type: "evmAddress",
            addresses: ["0x000000000000000000000000000000000000dEaD"],
            operator: "not in",
          },
        ],
      },
    ],
  },
});
```

### Delete a Policy

> [!WARNING] Attempting to delete an account-level policy in-use by at least one account will fail.

```typescript
const policy = await cdp.policies.deletePolicy({
  id: "__POLICY_ID__",
});
```

### Validate a Policy

If you're integrating policy editing into your application, you may find it useful to validate policies ahead of time to provide a user with feedback. The `CreatePolicyBodySchema` and `UpdatePolicyBodySchema` can be used to get actionable structured information about any issues with a policy. Read more about [handling ZodErrors](https://zod.dev/ERROR_HANDLING).

```ts
import { CreatePolicyBodySchema, UpdatePolicyBodySchema } from "@coinbase/cdp-sdk";

// Validate a new Policy with many issues, will throw a ZodError with actionable validation errors
try {
  CreatePolicyBodySchema.parse({
    description: "Bad description with !#@ characters, also is wayyyyy toooooo long!!",
    rules: [
      {
        action: "acept",
        operation: "unknownOperation",
        criteria: [
          {
            type: "ethValue",
            ethValue: "not a number",
            operator: "<=",
          },
          {
            type: "evmAddress",
            addresses: ["not an address"],
            operator: "in",
          },
          {
            type: "evmAddress",
            addresses: ["not an address"],
            operator: "invalid operator",
          },
        ],
      },
    ],
  });
} catch (e) {
  console.error(e);
}
```

#### Supported Policy Rules

We currently support the following policy rules:

- [SignEvmTransactionRule](https://docs.cdp.coinbase.com/api-reference/v2/rest-api/policy-engine/create-a-policy#signevmtransactionrule)
- [SendEvmTransactionRule](https://docs.cdp.coinbase.com/api-reference/v2/rest-api/policy-engine/create-a-policy#sendevmtransactionrule)
- [SignEvmMessageRule](https://docs.cdp.coinbase.com/api-reference/v2/rest-api/policy-engine/create-a-policy#signevmmessagerule)
- [SignEvmTypedDataRule](https://docs.cdp.coinbase.com/api-reference/v2/rest-api/policy-engine/create-a-policy#signevmtypeddatarule)
- [SignSolanaTransactionRule](https://docs.cdp.coinbase.com/api-reference/v2/rest-api/policy-engine/create-a-policy#signsolanatransactionrule)
- [SendSolanaTransactionRule](https://docs.cdp.coinbase.com/api-reference/v2/rest-api/policy-engine/create-a-policy#sendsolanatransactionrule)
- [SignEvmHashRule](https://docs.cdp.coinbase.com/api-reference/v2/rest-api/policy-engine/create-a-policy#signevmhashrule)
- [PrepareUserOperationRule](https://docs.cdp.coinbase.com/api-reference/v2/rest-api/policy-engine/create-a-policy#prepareuseroperationrule)
- [SendUserOperationRule](https://docs.cdp.coinbase.com/api-reference/v2/rest-api/policy-engine/create-a-policy#senduseroperationrule)

### End-user Management

You can use the End User SDK to manage the users of your applications.

#### Create End User

You can create an end user with authentication methods and optionally create EVM and Solana accounts for them.

```typescript
const endUser = await cdp.endUser.createEndUser({
  authenticationMethods: [
    { type: "email", email: "user@example.com" }
  ],
  evmAccount: { createSmartAccount: true },
  solanaAccount: { createSmartAccount: false },
});

console.log(endUser);
```

#### Import End User

You can import an existing private key for an end user:

```typescript
const endUser = await cdp.endUser.importEndUser({
  authenticationMethods: [
    { type: "email", email: "user@example.com" }
  ],
  privateKey: "0x...", // EVM private key (hex string)
  keyType: "evm",
});

console.log(endUser);
```

You can also import a Solana private key:

```typescript
const endUser = await cdp.endUser.importEndUser({
  authenticationMethods: [
    { type: "email", email: "user@example.com" }
  ],
  privateKey: "3Kzj...", // base58 encoded
  keyType: "solana",
});

console.log(endUser);
```

#### Add EVM Account to End User

Add an additional EVM EOA (Externally Owned Account) to an existing end user. You can call the method directly on the EndUser object:

```typescript
// Using the EndUser object method (recommended)
const result = await endUser.addEvmAccount();
console.log(`Added EVM account: ${result.evmAccount.address}`);

// Or using the client method
const result = await cdp.endUser.addEndUserEvmAccount({
  userId: endUser.userId,
});
console.log(`Added EVM account: ${result.evmAccount.address}`);
```

#### Add EVM Smart Account to End User

Add an EVM smart account to an existing end user:

```typescript
// Using the EndUser object method (recommended)
const result = await endUser.addEvmSmartAccount({ enableSpendPermissions: true });
console.log(`Added EVM smart account: ${result.evmSmartAccount.address}`);

// Or using the client method
const result = await cdp.endUser.addEndUserEvmSmartAccount({
  userId: endUser.userId,
  enableSpendPermissions: true,
});
console.log(`Added EVM smart account: ${result.evmSmartAccount.address}`);
```

#### Add Solana Account to End User

Add an additional Solana account to an existing end user:

```typescript
// Using the EndUser object method (recommended)
const result = await endUser.addSolanaAccount();
console.log(`Added Solana account: ${result.solanaAccount.address}`);

// Or using the client method
const result = await cdp.endUser.addEndUserSolanaAccount({
  userId: endUser.userId,
});
console.log(`Added Solana account: ${result.solanaAccount.address}`);
```

#### Validate Access Token

When your end user has signed in with an [Embedded Wallet](https://docs.cdp.coinbase.com/embedded-wallets/welcome), you can check whether the access token they were granted is valid, and which of your user's it is associated with.

```typescript
try {
  const endUser = await cdp.endUser.validateAccessToken({
      accessToken,
  });
  console.log(endUser)
} catch(e) {
  // the access token is not valid or expired
}
```

## Authentication tools

This SDK also contains simple tools for authenticating REST API requests to the [Coinbase Developer Platform (CDP)](https://docs.cdp.coinbase.com/). See the [Auth README](src/auth/README.md) for more details.

## Error Reporting

This SDK contains error reporting functionality that sends error events to CDP. If you would like to disable this behavior, you can set the `DISABLE_CDP_ERROR_REPORTING` environment variable to `true`.

```bash
DISABLE_CDP_ERROR_REPORTING=true
```

## Usage Tracking

This SDK contains usage tracking functionality that sends usage events to CDP. If you would like to disable this behavior, you can set the `DISABLE_CDP_USAGE_TRACKING` environment variable to `true`.

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/coinbase/cdp-sdk/tree/main/LICENSE.md) file for details.

## Support

For feature requests, feedback, or questions, please reach out to us in the **#cdp-sdk** channel of the [Coinbase Developer Platform Discord](https://discord.com/invite/cdp).

- [API Reference](https://docs.cdp.coinbase.com/api-v2/docs/welcome)
- [SDK Docs](https://coinbase.github.io/cdp-sdk/typescript)
- [GitHub Issues](https://github.com/coinbase/cdp-sdk/issues)

## Security

If you discover a security vulnerability within this SDK, please see our [Security Policy](https://github.com/coinbase/cdp-sdk/tree/main/SECURITY.md) for disclosure information.

## FAQ

Common errors and their solutions.

### TypeScript compilation errors with `generateJwt` or `moduleResolution`

If you encounter TypeScript compilation errors when using the CDP SDK, particularly with `generateJwt` or import statements, you may need to update your TypeScript configuration.

**Error symptoms:**
- Type errors with `generateJwt` function
- Module resolution errors
- Import/export type mismatches

**Solution:**

Update your `tsconfig.json` to use a modern module resolution strategy. Change `moduleResolution` from `node` to `node16` or `nodenext`:

```json
{
  "compilerOptions": {
    "moduleResolution": "node16",  // or "nodenext"
    // ... other options
  }
}
```

The CDP SDK is built as an ESM package and `moduleResolution: "node16"` or `"nodenext"` should be used for proper type resolution. The legacy `"node"` setting doesn't correctly resolve ESM package exports.

### AggregateError [ETIMEDOUT]

This is an issue in Node.js itself: https://github.com/nodejs/node/issues/54359. While [the fix](https://github.com/nodejs/node/pull/56738) is implemented, the workaround is to set the environment variable:

```bash
export NODE_OPTIONS="--network-family-autoselection-attempt-timeout=500"
```

### Error [ERR_REQUIRE_ESM]: require() of ES modules is not supported.

Use Node v20.19.0 or higher. CDP SDK depends on [jose](https://github.com/panva/jose) v6, which ships only ESM. Jose supports CJS style imports in Node.js versions where the require(esm) feature is enabled by default (^20.19.0 || ^22.12.0 || >= 23.0.0). [See here for more info](https://github.com/panva/jose?tab=readme-ov-file#user-content-fn-cjs-705c79d785ca9bc0f9ec1e8ce0825c74).

### Jest encountered an unexpected token

If you're using Jest and see an error like this:

```
Details:

/Users/.../node_modules/jose/dist/webapi/index.js:1
({"Object.<anonymous>":function(module,exports,require,__dirname,__filename,jest){export { compactDecrypt } from './jwe/compact/decrypt.js';
                                                                                  ^^^^^^

SyntaxError: Unexpected token 'export'
```

Add a file called `jest.setup.ts` next to your `jest.config` file with the following content:

```typescript
jest.mock("jose", () => {});
```

Then, add the following line to your `jest.config` file:

```typescript
setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
```
