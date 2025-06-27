# CDP SDK Changelog

## 1.21.0

### Minor Changes

- [#242](https://github.com/coinbase/cdp-sdk/pull/242) [`bcc21c1`](https://github.com/coinbase/cdp-sdk/commit/bcc21c1cb6880b7a31ec6731d3e8f434e1fff324) Thanks [@0xRAG](https://github.com/0xRAG)! - Automatically set paymasterUrl to Base Node URL on Smart Accounts scoped to Base

- [#241](https://github.com/coinbase/cdp-sdk/pull/241) [`938233f`](https://github.com/coinbase/cdp-sdk/commit/938233f7e5db52f249fe15bdde1e22ff89a776fa) Thanks [@0xRAG](https://github.com/0xRAG)! - Added type-safe network hoisted methods to EvmSmartAccount

- [#245](https://github.com/coinbase/cdp-sdk/pull/245) [`babe262`](https://github.com/coinbase/cdp-sdk/commit/babe262bac81249393133a77b8b4c7985bf2b537) Thanks [@0xRAG](https://github.com/0xRAG)! - Added automatic paymasterUrl when sending user operations

  This will work with scoped and un-scoped smart accounts, as long as the network is `base`.

- [#233](https://github.com/coinbase/cdp-sdk/pull/233) [`9d02af8`](https://github.com/coinbase/cdp-sdk/commit/9d02af82ce02ca541a3c05fbe7666dc6da42c31f) Thanks [@0xRAG](https://github.com/0xRAG)! - Added all methods to network-hoisted EvmServerAccount

- [#239](https://github.com/coinbase/cdp-sdk/pull/239) [`cd87b8a`](https://github.com/coinbase/cdp-sdk/commit/cd87b8a87a720124d22fed567dbb8c3134849023) Thanks [@milan-cb](https://github.com/milan-cb)! - Added a importAccount method to the Solana client

### Patch Changes

- [#247](https://github.com/coinbase/cdp-sdk/pull/247) [`111b95b`](https://github.com/coinbase/cdp-sdk/commit/111b95b3529b376517242f54a63bec47922bfa8e) Thanks [@milan-cb](https://github.com/milan-cb)! - Fixed a bug that breaks dev E2E tests due to using wrong RSA public key

## 1.20.0

### Minor Changes

- [#234](https://github.com/coinbase/cdp-sdk/pull/234) [`f66893d`](https://github.com/coinbase/cdp-sdk/commit/f66893d173fa35e58d97ece8d9db04b918873cc4) Thanks [@github-actions](https://github.com/apps/github-actions)! - Added ethereum & ethereum-sepolia to SendEvmTransaction

- [#232](https://github.com/coinbase/cdp-sdk/pull/232) [`7193c6f`](https://github.com/coinbase/cdp-sdk/commit/7193c6fe15b072523cb2fd6fea3744001fb99235) Thanks [@superadi04](https://github.com/superadi04)! - Added transfer function to managed EvmServerAccount

## 1.19.0

### Minor Changes

- [#227](https://github.com/coinbase/cdp-sdk/pull/227) [`7593f22`](https://github.com/coinbase/cdp-sdk/commit/7593f228aae4a2d6993b47e4168289b002456060) Thanks [@0xRAG](https://github.com/0xRAG)! - Added automatic fetching of Base Node URL when scoping an account to Base or Base Sepolia

- [#228](https://github.com/coinbase/cdp-sdk/pull/228) [`2105a10`](https://github.com/coinbase/cdp-sdk/commit/2105a10d7ff643b946b8068091ad6ffc5229c202) Thanks [@0xRAG](https://github.com/0xRAG)! - Added ability to pass full transaction result into managed waitForTransactionReceipt

### Patch Changes

- [#210](https://github.com/coinbase/cdp-sdk/pull/210) [`ca57197`](https://github.com/coinbase/cdp-sdk/commit/ca57197a45891c3f8c85e43d45b7de3511196ab2) Thanks [@sddioulde](https://github.com/sddioulde)! - Updated wallet jwt claim to use hash of request body

## 1.18.0

### Minor Changes

- [#224](https://github.com/coinbase/cdp-sdk/pull/224) [`5d6e5a1`](https://github.com/coinbase/cdp-sdk/commit/5d6e5a164a23424444998cf51970836ee57ca659) Thanks [@0xRAG](https://github.com/0xRAG)! - Added useNetwork function on EvmServerAccount to enable node management and network hoisting

## 1.17.0

### Minor Changes

- [#220](https://github.com/coinbase/cdp-sdk/pull/220) [`c91b8da`](https://github.com/coinbase/cdp-sdk/commit/c91b8da383f747de683019a011cbe3453684d6aa) Thanks [@sammccord](https://github.com/sammccord)! - Added support for `EvmDataCriterion` in policies, which can restrict smart contract interactions

## 1.16.0

### Minor Changes

- [#165](https://github.com/coinbase/cdp-sdk/pull/165) [`b39c739`](https://github.com/coinbase/cdp-sdk/commit/b39c739979e92f97f7dd232e2932442bd0251436) Thanks [@derek-cb](https://github.com/derek-cb)! - Added swap support for EVM Smart Accounts.

- [#165](https://github.com/coinbase/cdp-sdk/pull/165) [`b39c739`](https://github.com/coinbase/cdp-sdk/commit/b39c739979e92f97f7dd232e2932442bd0251436) Thanks [@derek-cb](https://github.com/derek-cb)! - Added idempotency support for getSwapPrice and createSwapQuote

### Patch Changes

- [#165](https://github.com/coinbase/cdp-sdk/pull/165) [`b39c739`](https://github.com/coinbase/cdp-sdk/commit/b39c739979e92f97f7dd232e2932442bd0251436) Thanks [@derek-cb](https://github.com/derek-cb)! - Fix usage of optional idempotency keys for one-line swap approach.

- [#211](https://github.com/coinbase/cdp-sdk/pull/211) [`3a497cf`](https://github.com/coinbase/cdp-sdk/commit/3a497cfee26cd5f143940cb067fa5d438e79c590) Thanks [@0xRAG](https://github.com/0xRAG)! - Updated types for signTypedData to fix TypeError when wrapping CDP Account in viem's toAccount helper

## 1.15.0

### Minor Changes

- [#189](https://github.com/coinbase/cdp-sdk/pull/189) [`8f829cd`](https://github.com/coinbase/cdp-sdk/commit/8f829cd4f340968dcb5d8721d83c2b7fc487c176) Thanks [@sddioulde](https://github.com/sddioulde)! - Added evm and solana account export by address or name

## 1.14.0

### Minor Changes

- [#183](https://github.com/coinbase/cdp-sdk/pull/183) [`c3c0d4c`](https://github.com/coinbase/cdp-sdk/commit/c3c0d4ccb332cf573924c9a3b5a5c3da4fbcf9f3) Thanks [@superadi04](https://github.com/superadi04)! - Added getOrCreateSmartAccount by name to the EVM client.

  Also updated getSmartAccount to allow getting a smart account by name and createSmartAccount to allow creating a smart account with a name.

### Patch Changes

- [#190](https://github.com/coinbase/cdp-sdk/pull/190) [`040551a`](https://github.com/coinbase/cdp-sdk/commit/040551af8f8b64d39cb2ce774f39e0420e21db45) Thanks [@0xRAG](https://github.com/0xRAG)! - Updated type of EvmTokenAmount.decimals to be number instead of bigint

- [#188](https://github.com/coinbase/cdp-sdk/pull/188) [`1ff0dd3`](https://github.com/coinbase/cdp-sdk/commit/1ff0dd371185ba8f659a116fb58105e7c26139e4) Thanks [@0xRAG](https://github.com/0xRAG)! - Fixed signTypedData to automatically infer EIP712Domain

- [#191](https://github.com/coinbase/cdp-sdk/pull/191) [`334cc47`](https://github.com/coinbase/cdp-sdk/commit/334cc47ea564aefcf6bc06c6e05676d21121f5dd) Thanks [@derek-cb](https://github.com/derek-cb)! - Log response body for unexpected error scenarios

## 1.13.0

### Minor Changes

- [#176](https://github.com/coinbase/cdp-sdk/pull/176) [`ee515c0`](https://github.com/coinbase/cdp-sdk/commit/ee515c0b9daefe92e6de178bee5cf2289ac41bfe) Thanks [@sddioulde](https://github.com/sddioulde)! - Added support for signEvmHash and signEvmMessage policy rules

- [#184](https://github.com/coinbase/cdp-sdk/pull/184) [`467283c`](https://github.com/coinbase/cdp-sdk/pull/184/commits/467283ccdfb4df4f2f4d89b15c343b4756a5e0a8) Removed taker field parameter from account.swap() method

## 1.12.0

### Minor Changes

- [#150](https://github.com/coinbase/cdp-sdk/pull/150) - Added support for swaps on EVM networks for EOAs.

## 1.11.0

### Minor Changes

- [#156](https://github.com/coinbase/cdp-sdk/pull/156) [`6e696cf`](https://github.com/coinbase/cdp-sdk/commit/6e696cf75e8e1f69180f192bc82103ca1b5dd6a9) Thanks [@rohan-agarwal-coinbase](https://github.com/rohan-agarwal-coinbase)! - Added support for funding an EVM account with eth or usdc using a linked debit card

- [#168](https://github.com/coinbase/cdp-sdk/pull/168) [`81e4de1`](https://github.com/coinbase/cdp-sdk/commit/81e4de18222108248d2230d77f4e1ac05e6a6aba) Thanks [@sddioulde](https://github.com/sddioulde)! - Added ability to create account with policy

## 1.10.0

### Minor Changes

- [#148](https://github.com/coinbase/cdp-sdk/pull/148) [`c894aba`](https://github.com/coinbase/cdp-sdk/commit/c894aba9facb6c64a6a7e3a5537592ae591ce7e8) Thanks [@marcin-cb](https://github.com/marcin-cb)! - Added an ImportAccount method to the EVM client

## 1.9.0

### Minor Changes

- [#128](https://github.com/coinbase/cdp-sdk/pull/128) [`bd4d1d6`](https://github.com/coinbase/cdp-sdk/commit/bd4d1d6855627e24bd4b51937e40df27a2595559) Thanks [@0xRAG](https://github.com/0xRAG)! - Added transfer method to Solana account to easily send tokens on Solana

- [#133](https://github.com/coinbase/cdp-sdk/pull/133) [`438d967`](https://github.com/coinbase/cdp-sdk/commit/438d967401c06469bfc44c581a6c0994f77c0f9e) Thanks [@0xRAG](https://github.com/0xRAG)! - Updated Transfer API to allow users to wait for receipt and pass in a parsed amount to transfer

- [#141](https://github.com/coinbase/cdp-sdk/pull/141) [`c0273f9`](https://github.com/coinbase/cdp-sdk/commit/c0273f96769f74c78cddbbf0b109dc47cc16b7ca) Thanks [@sammccord](https://github.com/sammccord)! - Added SendEvmTransactionRule to Policy Rules

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
