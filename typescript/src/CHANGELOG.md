# CDP SDK Changelog

## 1.8.0

### Minor Changes

- [#124](https://github.com/coinbase/cdp-sdk/pull/124) [`9b874f8`](https://github.com/coinbase/cdp-sdk/commit/9b874f85b8b21fa8f5ab2b724413cdd41a5423ea) Thanks [@sammccord](https://github.com/sammccord)! - Added all Policy Engine functionality; CRUD operations and zod schemas

- [#130](https://github.com/coinbase/cdp-sdk/pull/130) [`3274e09`](https://github.com/coinbase/cdp-sdk/commit/3274e099612209daf756e0c06857ea29f880318c) Thanks [@sammccord](https://github.com/sammccord)! - Added updateAccount for evm and solana namespaces, as well as account.policies on response types

- [#129](https://github.com/coinbase/cdp-sdk/pull/129) [`b4f6b43`](https://github.com/coinbase/cdp-sdk/commit/b4f6b43d936a9e87eed488ea236bf74851241d65) Thanks [@sddioulde](https://github.com/sddioulde)! - Added support for eip-712 signing

## 1.7.0

### Minor Changes

- [#116](https://github.com/coinbase/cdp-sdk/pull/116) [`97678d6`](https://github.com/coinbase/cdp-sdk/commit/97678d675358bb8d0b6195fd31933a32926cdd44) Thanks [@sddioulde](https://github.com/sddioulde)! - Added getUserOperation smart account action

- [#122](https://github.com/coinbase/cdp-sdk/pull/122) [`ee41d98`](https://github.com/coinbase/cdp-sdk/commit/ee41d986406e3e8666d1d1a1b1525e7ff7435a2b) Thanks [@sddioulde](https://github.com/sddioulde)! - Added account actions to Solana

- [#103](https://github.com/coinbase/cdp-sdk/pull/103) [`2777cde`](https://github.com/coinbase/cdp-sdk/commit/2777cde93e4f10579a4ca31e140720067799cf66) Thanks [@0xRAG](https://github.com/0xRAG)! - Added additional options to transfer methods:

  - Added `paymasterUrl` and `waitOptions` to EvmSmartAccount.transfer
  - Added `waitOptions` to EvmAccount.transfer

## 1.6.0

### Minor Changes

- [#99](https://github.com/coinbase/cdp-sdk/pull/99) [`0fd6d2b`](https://github.com/coinbase/cdp-sdk/commit/0fd6d2ba56b2da52c96eb19278dc782560b7680b) Thanks [@0xRAG](https://github.com/0xRAG)! - Added actions to EvmAccount and EvmSmartAccount:

  - listTokenBalances
  - requestFaucet
  - sendTransaction (EvmAccount only)
  - sendUserOperation (EvmSmartAccount only)
  - waitForUserOperation (EvmSmartAccount only)

## 1.5.0

### Minor Changes

- [#94](https://github.com/coinbase/cdp-sdk/pull/94) [`071515e`](https://github.com/coinbase/cdp-sdk/commit/071515e5c8222ba277e207e1c5507d73379ebe5e) Thanks [@sddioulde](https://github.com/sddioulde)! - Added a getOrCreateAccount function to the EVM and Solana clients

- [#90](https://github.com/coinbase/cdp-sdk/pull/90) [`2bf3dfb`](https://github.com/coinbase/cdp-sdk/commit/2bf3dfbd60a5a6b2f127454a5ce67ade5463eff9) Thanks [@0xRAG](https://github.com/0xRAG)! - Added transfer methods EvmAccount and EvmSmartAccount

## 1.4.0

### Minor Changes

- [#75](https://github.com/coinbase/cdp-sdk/pull/75) [`bb056f6`](https://github.com/coinbase/cdp-sdk/commit/bb056f60c3873a399f8721a953edeaed2a868d76) Thanks [@derek-cb](https://github.com/derek-cb)! - Added the ability to generate JWTs intended for Websocket connections Added the ability to pass the "audience" JWT claim as an optional param

## 1.3.2

### Patch Changes

- [#76](https://github.com/coinbase/cdp-sdk/pull/76) [`24463f0`](https://github.com/coinbase/cdp-sdk/commit/24463f0e5a3c4463a287cc5305bcc0d07f4f9654) Thanks [@0xRAG](https://github.com/0xRAG)! - Fix circular dependency when importing @coinbase/cdp-sdk

## 1.3.1

### Patch Changes

- This patch contains a README update to accomodate the new home for CDP SDK examples.

## 1.3.0

### Minor Changes

- [#55](https://github.com/coinbase/cdp-sdk/pull/55) [`7692260`](https://github.com/coinbase/cdp-sdk/commit/7692260e465d5887629519b75e7d27d26bd372f0) Thanks [@yuga-cb](https://github.com/yuga-cb)! - Added listTokenBalances to the EVM client to retrieve ERC-20 and native token balances for an address on a given network.

- [#58](https://github.com/coinbase/cdp-sdk/pull/58) [`29765e8`](https://github.com/coinbase/cdp-sdk/commit/29765e8146ef3b44985a5dbbe9d23023a2acffc1) Thanks [@0xRAG](https://github.com/0xRAG)! - Added sendTransaction to the EVM client to sign and send a transaction on a given network.

### Patch Changes

- [#56](https://github.com/coinbase/cdp-sdk/pull/56) [`381c430`](https://github.com/coinbase/cdp-sdk/commit/381c43039013cec7799d02df00247fa8256d16b1) Thanks [@0xRAG](https://github.com/0xRAG)! - Improved error handling and reporting.

## 1.2.0

### Minor Changes

- [#49](https://github.com/coinbase/cdp-sdk/pull/49) [`6d05130`](https://github.com/coinbase/cdp-sdk/commit/6d05130d9dc1db182bfeb2e2212979b7ab47cff4) Thanks [@0xRAG](https://github.com/0xRAG)! - Implement dual builds: output both CJS and ESM code

### Patch Changes

- [#51](https://github.com/coinbase/cdp-sdk/pull/51) [`1343a3e`](https://github.com/coinbase/cdp-sdk/commit/1343a3eb2b33df236fab883f50c8f9a5e13acd9c) Thanks [@0xRAG](https://github.com/0xRAG)! - Bump @solana/web3.js to v1.98.1 which includes a fix for a security vulnerability

## 1.1.2

### Patch Changes

- [#41](https://github.com/coinbase/cdp-sdk/pull/41) [`3006fe0`](https://github.com/coinbase/cdp-sdk/commit/3006fe03bc50a2d3b9869d08c9c0690d7bc6bd4d) Thanks [@0xRAG](https://github.com/0xRAG)! - Return transactionHash in getUserOperation

## 1.1.1

### Patch Changes

- [#36](https://github.com/coinbase/cdp-sdk/pull/36) [`3a24e74`](https://github.com/coinbase/cdp-sdk/commit/3a24e74b07551023a5fbe542759f7fbe27c15201) Thanks [@0xRAG](https://github.com/0xRAG)! - Accept CDP_API_KEY_ID over CDP_API_KEY_NAME

## 1.1.0

### Minor Changes

- [#29](https://github.com/coinbase/cdp-sdk/pull/29) [`b9455ce`](https://github.com/coinbase/cdp-sdk/commit/b9455ce88dc7f8340637bd617757af0571b7558a) Thanks [@0xRAG](https://github.com/0xRAG)! - Add support for configuring `CdpClient` via environment variables.

  Developers can now simply set the following environment variables in their shell:

  ```bash
  export CDP_API_KEY_NAME=your-api-key-id
  export CDP_API_KEY_SECRET=your-api-key-secret
  export CDP_WALLET_SECRET=your-wallet-secret
  ```

  And configure the `CdpClient` like so:

  ```typescript
  import { CdpClient } from "@coinbase/cdp-sdk";

  const cdp = new CdpClient();
  ```

  Or, load from a `.env` file:

  ```bash
  # .env
  CDP_API_KEY_NAME=your-api-key-id
  CDP_API_KEY_SECRET=your-api-key-secret
  CDP_WALLET_SECRET=your-wallet-secret
  ```

  And configure the `CdpClient` like so:

  ```typescript
  import { CdpClient } from "@coinbase/cdp-sdk";
  import { config } from "dotenv";

  config();

  const cdp = new CdpClient();
  ```

- [#27](https://github.com/coinbase/cdp-sdk/pull/27) [`3e11b51`](https://github.com/coinbase/cdp-sdk/commit/3e11b5115eb822c8b904c6d842f27460a8f28356) Thanks [@0xRAG](https://github.com/0xRAG)! - Export auth subpackage

## 1.0.1

### Patch Changes

- [#23](https://github.com/coinbase/cdp-sdk/pull/23) [`dd7b5ef`](https://github.com/coinbase/cdp-sdk/commit/dd7b5ef474987db55462a734cab484e00e0c4825) Thanks [@0xRAG](https://github.com/0xRAG)! - Use TransactionSerializable to improve compatability with toAccount from viem

## 1.0.0

### Major Changes

- Initial release of the CDP SDK.
