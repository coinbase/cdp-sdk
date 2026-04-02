# CDP SDK Examples

## Setup

Follow these steps to get started:

1. Get a CDP API key and wallet secret from the [CDP Portal](https://portal.cdp.coinbase.com/access/api)
1. Fill in your API key and wallet secret in `.env.example`, then run `mv .env.example .env`
1. In the root `typescript/` folder, run `pnpm install && pnpm build`. You only need to do this once
1. In the `examples/typescript` folder, run `pnpm install` to install the dependencies

## Usage

To run an example, use `pnpm tsx` followed by the path to the example file, for example:

```bash
pnpm tsx evm/createAccount.ts
```

## Available Examples

### EVM

| Example | Description |
|---------|-------------|
| `evm/accounts/` | Create, list, and get EVM accounts |
| `evm/transactions/` | Send EVM transactions |
| `evm/smart-accounts/` | Create and manage EVM smart accounts (ERC-4337) |
| `evm/eip7702/` | Create EIP-7702 delegations for EOA accounts |
| `evm/swaps/` | Swap tokens on EVM networks |
| `evm/spend-permissions/` | Create and manage spend permissions |
| `evm/policies/` | Create and manage transaction policies |
| `evm/token-balances/` | List token balances |
| `evm/fund/` | Request testnet faucet funds |
| `evm/account.signTypedData.ts` | Sign EIP-712 typed data |

### Solana

| Example | Description |
|---------|-------------|
| `solana/accounts/` | Create and list Solana accounts |
| `solana/transactions/` | Send Solana transactions |
| `solana/tokens/` | List Solana token balances |
| `solana/funding/` | Request testnet SOL from faucet |
| `solana/policies/` | Create and manage Solana policies |

### End Users

End-user operations allow you to manage embedded wallet users and perform delegated signing/sending on their behalf.

> **Important:** Delegated sign and send operations (marked with \*) require the end user to have first created a **delegation** granting the developer permission to sign on their behalf. Without an active delegation, these operations will fail.

#### User Management

| Example | Command |
|---------|---------|
| Create end users | `pnpm tsx end-users/createEndUser.ts` |
| Get an end user | `pnpm tsx end-users/getEndUser.ts` |
| List end users | `pnpm tsx end-users/listEndUsers.ts` |
| Import end user with private key | `pnpm tsx end-users/importEndUser.ts` |
| Validate access token | `pnpm tsx end-users/validateAccessToken.ts` |

#### Account Management

| Example | Command |
|---------|---------|
| Add EVM EOA account | `pnpm tsx end-users/addEndUserEvmAccount.ts` |
| Add EVM smart account | `pnpm tsx end-users/addEndUserEvmSmartAccount.ts` |
| Add Solana account | `pnpm tsx end-users/addEndUserSolanaAccount.ts` |

#### Delegation Lifecycle

| Example | Command |
|---------|---------|
| Create EIP-7702 delegation\* | `pnpm tsx end-users/createEvmEip7702Delegation.ts <USER_UUID>` |
| Revoke delegation\* | `pnpm tsx end-users/revokeDelegation.ts <USER_UUID>` |

#### Delegated EVM Operations

| Example | Command |
|---------|---------|
| Sign EVM hash\* | `pnpm tsx end-users/signEvmHash.ts <USER_UUID>` |
| Send EVM transaction\* | `pnpm tsx end-users/sendEvmTransaction.ts <USER_UUID>` |
| Send EVM asset (USDC)\* | `pnpm tsx end-users/sendEvmAsset.ts <USER_UUID>` |
| Send user operation (smart account)\* | `pnpm tsx end-users/sendUserOperation.ts <USER_UUID>` |

#### Delegated Solana Operations

| Example | Command |
|---------|---------|
| Sign Solana message\* | `pnpm tsx end-users/signSolanaMessage.ts <USER_UUID>` |

#### Policies

| Example | Command |
|---------|---------|
| Create end-user policy | `pnpm tsx end-users/createEndUserPolicy.ts` |

End-user operations support two invocation patterns:

1. **Client method** -- explicitly provide `userId` and `address`:
   ```typescript
   const result = await cdp.endUser.signEvmHash({
     userId: endUser.userId,
     address: endUser.evmAccountObjects[0].address,
     hash: "0x...",
   });
   ```

2. **Account method** -- called directly on the `EndUserAccount` object, which auto-binds `userId` and defaults `address` to the first account:
   ```typescript
   const result = await endUser.signEvmHash({
     hash: "0x...",
   });
   ```

### Quickstart

| Example | Command |
|---------|---------|
| Full quickstart workflow | `pnpm tsx quickstart/quickstart.ts` |
