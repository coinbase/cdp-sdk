# Coinbase Developer Platform (CDP) TypeScript SDK

## Table of Contents

- [CDP SDK](#cdp-sdk)
- [Documentation](#documentation)
- [Installation](#installation)
- [API Keys](#api-keys)
- [Usage](#usage)
- [Policy Management](#policy-management)
- [Authentication tools](#authentication-tools)
- [Error Reporting](#error-reporting)
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

### Creating EVM or Solana accounts

#### Create an EVM account as follows:

```typescript
const account = await cdp.evm.createAccount();
```

#### Create a Solana account as follows:

```typescript
const account = await cdp.solana.createAccount();
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

### Updating EVM or Solana accounts

#### Update an EVM account as follows:

```typescript
const account = await cdp.evm.updateAccount({
  addresss: account.address,
  update: {
    name: "Updated name",
    accountPolicy: "1622d4b7-9d60-44a2-9a6a-e9bbb167e412"
  }
});
```

#### Update a Solana account as follows:

```typescript
const account = await cdp.solana.updateAccount({
  addresss: account.address,
  update: {
    name: "Updated name",
    accountPolicy: "1622d4b7-9d60-44a2-9a6a-e9bbb167e412"
  }
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

For Solana, we recommend using the `@solana/web3.js` library to send transactions. See the [examples](https://github.com/coinbase/cdp-sdk/tree/main/examples/typescript/solana/signAndSendTransaction.ts).

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

### Transferring tokens

For complete examples, check out [transfer.ts](https://github.com/coinbase/cdp-sdk/blob/main/examples/typescript/evm/transfer.ts) and [transferWithSmartWallet.ts](https://github.com/coinbase/cdp-sdk/blob/main/examples/typescript/evm/transferWithSmartWallet.ts).

You can transfer tokens between accounts using the `transfer` function:

```typescript
const sender = await cdp.evm.createAccount({ name: "Sender" });

const { status } = await sender.transfer({
  to: "0x9F663335Cd6Ad02a37B633602E98866CF944124d",
  amount: "0.01",
  token: "usdc",
  network: "base-sepolia",
});
```

Smart Accounts also have a `transfer` function:

```typescript
const sender = await cdp.evm.createSmartAccount({
  owner: privateKeyToAccount(generatePrivateKey()),
});
console.log("Created smart account", sender);

const { status } = await sender.transfer({
  to: "0x9F663335Cd6Ad02a37B633602E98866CF944124d",
  amount: "0.01",
  token: "usdc",
  network: "base-sepolia",
});
```

Using Smart Accounts, you can also specify a paymaster URL and wait options:

```typescript
const { status } = await sender.transfer({
  to: "0x9F663335Cd6Ad02a37B633602E98866CF944124d",
  amount: "0.01",
  token: "usdc",
  network: "base-sepolia",
  paymasterUrl: "https://some-paymaster-url.com",
  waitOptions: {
    timeout: 30,
    interval: 2,
  },
});
```

If you pass a decimal amount in a string, the SDK will parse it into a bigint based on the token's decimals. You can also pass a bigint directly:

```typescript
const { status } = await sender.transfer({
  to: "0x9F663335Cd6Ad02a37B633602E98866CF944124d",
  amount: 10000n, // equivalent to 0.01 usdc
  token: "usdc",
  network: "base-sepolia",
});
```

You can pass `usdc` or `eth` as the token to transfer, or you can pass a contract address directly:

```typescript
const { status } = await sender.transfer({
  to: "0x9F663335Cd6Ad02a37B633602E98866CF944124d",
  amount: "0.000001",
  token: "0x4200000000000000000000000000000000000006", // WETH on Base Sepolia
  network: "base-sepolia",
});
```

You can also pass another account as the `to` parameter:

```typescript
const sender = await cdp.evm.createAccount({ name: "Sender" });
const receiver = await cdp.evm.createAccount({ name: "Receiver" });

const { status } = await sender.transfer({
  to: receiver,
  amount: "0.01",
  token: "usdc",
  network: "base-sepolia",
});
```

You can also pass wait options to the `transfer` function:

```typescript
const { status } = await sender.transfer({
  to: receiver,
  amount: "0.01",
  token: "usdc",
  network: "base-sepolia",
  waitOptions: {
    timeout: 30,
    interval: 2,
  },
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
  message: "Hello, world!"
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
    scope: 'project',
    description: 'Project-wide Allowlist Policy',
    rules: [
      {
        action: 'accept',
        operation: 'signEvmTransaction',
        criteria: [
          {
            type: 'ethValue',
            ethValue: '1000000000000000000',
            operator: '<='
          },
          {
            type: 'evmAddress',
            addresses: ["0x000000000000000000000000000000000000dEaD"],
            operator: 'in'
          }
        ]
      }
    ]
  }
});
```

### Create an Account-level policy

This policy will accept any transaction with a value less than or equal to 1 ETH to a specific address.

```typescript
const policy = await cdp.policies.createPolicy({
  policy: {
    scope: 'account',
    description: 'Account Allowlist Policy',
    rules: [
      {
        action: 'accept',
        operation: 'signEvmTransaction',
        criteria: [
          {
            type: 'ethValue',
            ethValue: '1000000000000000000',
            operator: '<='
          },
          {
            type: 'evmAddress',
            addresses: ["0x000000000000000000000000000000000000dEaD"],
            operator: 'in'
          }
        ]
      }
    ]
  }
});
```

### Create a Solana Allowlist Policy

```typescript
const policy = await cdp.policies.createPolicy({
  policy: {
    scope: 'account',
    description: 'Account Allowlist Policy',
    rules: [
      {
        action: 'accept',
        operation: 'signSolTransaction',
        criteria: [
          {
            type: 'solAddress',
            addresses: ["DtdSSG8ZJRZVv5Jx7K1MeWp7Zxcu19GD5wQRGRpQ9uMF"],
            operator: 'in'
          }
        ]
      }
    ]
  }
});
```

### List Policies

You can filter by account:

```typescript
const policy = await cdp.policies.listPolicies({
  scope: 'account'
});
```

You can also filter by project:

```typescript
const policy = await cdp.policies.listPolicies({
  scope: 'project'
});
```

### Retrieve a Policy

```typescript
const policy = await cdp.policies.getPolicyById({
  id: '__POLICY_ID__'
});
```

### Update a Policy

This policy will update an existing policy to accept transactions to any address except one.

```typescript
const policy = await cdp.policies.updatePolicy({
  id: '__POLICY_ID__',
  policy: {
    description: 'Updated Account Denylist Policy',
    rules: [
      {
        action: 'accept',
        operation: 'signEvmTransaction',
        criteria: [
          {
            type: 'evmAddress',
            addresses: ["0x000000000000000000000000000000000000dEaD"],
            operator: 'not in'
          }
        ]
      }
    ]
  }
});
```

### Delete a Policy

> [!WARNING]
> Attempting to delete an account-level policy in-use by at least one account will fail.

```typescript
const policy = await cdp.policies.deletePolicy({
  id: '__POLICY_ID__'
});
```

### Validate a Policy

If you're integrating policy editing into your application, you may find it useful to validate policies ahead of time to provide a user with feedback. The `CreatePolicyBodySchema` and `UpdatePolicyBodySchema` can be used to get actionable structured information about any issues with a policy. Read more about [handling ZodErrors](https://zod.dev/ERROR_HANDLING).

```ts
import { CreatePolicyBodySchema, UpdatePolicyBodySchema } from "@coinbase/cdp-sdk";

// Validate a new Policy with many issues, will throw a ZodError with actionable validation errors
try {
  CreatePolicyBodySchema.parse({
    description: 'Bad description with !#@ characters, also is wayyyyy toooooo long!!',
    rules: [
      {
        action: 'acept',
        operation: 'unknownOperation',
        criteria: [
          {
            type: 'ethValue',
            ethValue: 'not a number',
            operator: '<='
          },
          {
            type: 'evmAddress',
            addresses: ["not an address"],
            operator: 'in'
          },
          {
            type: 'evmAddress',
            addresses: ["not an address"],
            operator: 'invalid operator'
          }
        ]
      },
    ]
  })
} catch(e) {
  console.error(e)
}
````

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

## FAQ

Common errors and their solutions.

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
