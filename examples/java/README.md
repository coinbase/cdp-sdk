# CDP Java SDK Examples

These examples use the canonical `com.coinbase.cdp` Java SDK package.

## Setup

```bash
cp .env.example .env
```

Configure at least:

```text
CDP_API_KEY_ID=your-api-key-id
CDP_API_KEY_SECRET=your-api-key-secret
```

Set `CDP_WALLET_SECRET` for EVM and Solana wallet write operations. Flexible custody operations use API-key authentication.

## Run an example

```bash
./gradlew runExample -PexampleMainClass=com.coinbase.cdp.examples.ListEvmAccounts
```

## Available examples

### EVM and Solana

- `CreateEvmAccount`
- `GetEvmAccount`
- `ListEvmAccounts`
- `ListEvmSmartAccounts`
- `GetEvmSwapPrice`
- `ListEvmTokenBalances`
- `RequestEvmFaucet`
- `SignEvmMessage`
- `SignEvmTypedData`
- `SendEvmTransaction`
- `ListSolanaAccounts`
- `ListSolanaTokenBalances`

### Flexible custody

- `ListAccounts`
- `CreateCustodyAccount`
- `ListPaymentMethods`
- `ListDepositDestinations`
- `ListTransfers`
- `CreateOnchainTransfer`

`CreateOnchainTransfer` requests a quote by default (`CDP_TRANSFER_EXECUTE=false`). It submits a live transfer only when both `CDP_TRANSFER_EXECUTE=true` and `CDP_TRANSFER_CONFIRMATION=I_UNDERSTAND` are set and the target address is controlled by the caller.

### Policies and end users

- `ListPolicies`
- `ListEndUsers`
- `GetEndUserDelegation`
- `RawResponse`

## Build examples

```bash
./gradlew examplesClasses
./gradlew build
```
