# CDP SDK Changelog

## 1.44.0

### Minor Changes

- [#577](https://github.com/coinbase/cdp-sdk/pull/577) [`142499a`](https://github.com/coinbase/cdp-sdk/commit/142499abc3ea8d9835b5d953e8d1e22d4922e663) Thanks [@marcin-cb](https://github.com/marcin-cb)! - Added new methods for the end user client to add additional EVM accounts, EVM Smart Accounts, and Solana accounts.

- [#579](https://github.com/coinbase/cdp-sdk/pull/579) [`fe9d065`](https://github.com/coinbase/cdp-sdk/commit/fe9d065c6cd547497d2ab3534a84ff43d752d2cd) Thanks [@marcin-cb](https://github.com/marcin-cb)! - Added convenience methods to the EndUserAccount object for adding accounts.

### Patch Changes

- [#571](https://github.com/coinbase/cdp-sdk/pull/571) [`a5546d1`](https://github.com/coinbase/cdp-sdk/commit/a5546d1d4132f7703b4625dcd9b218039775e8d9) Thanks [@0xRAG](https://github.com/0xRAG)! - Improve typing and make tsconfig stricter

## 1.43.1

### Patch Changes

- [#565](https://github.com/coinbase/cdp-sdk/pull/565) [`80dd120`](https://github.com/coinbase/cdp-sdk/commit/80dd120d255c3aa6880af02d7fd320d392431ed3) Thanks [@0xRAG](https://github.com/0xRAG)! - Fixed bug in transfer method to support transfers on non-Base networks

## 1.43.0

### Minor Changes

- [#545](https://github.com/coinbase/cdp-sdk/pull/545) [`9a532bc`](https://github.com/coinbase/cdp-sdk/commit/9a532bcd0770bd7239e042c2dfd14022ab6ce4cd) Thanks [@marcin-cb](https://github.com/marcin-cb)! - Added importEndUser to the end user client

## 1.42.0

### Minor Changes

- [#547](https://github.com/coinbase/cdp-sdk/pull/547) [`bccbced`](https://github.com/coinbase/cdp-sdk/commit/bccbceda35fd141fb327514be5ab24b573a4dba8) Thanks [@milan-cb](https://github.com/milan-cb)! - Added getEndUser method for End User operations

## 1.41.0

### Minor Changes

- [#541](https://github.com/coinbase/cdp-sdk/pull/541) [`3d25993`](https://github.com/coinbase/cdp-sdk/commit/3d25993cd6d1b5c0ac0e48539695ee167b3b2d0e) Thanks [@milan-cb](https://github.com/milan-cb)! - Added spend permissions for pre-generated smart accounts

## 1.40.2

### Patch Changes

- [#539](https://github.com/coinbase/cdp-sdk/pull/539) [`b08076c`](https://github.com/coinbase/cdp-sdk/commit/b08076cf688f3f2bc3186ad9406062808007cb2c) Thanks [@tmm](https://github.com/tmm)! - Upgraded internal `@solana/kit` version to 5.1.0

## 1.40.1

### Patch Changes

- [#510](https://github.com/coinbase/cdp-sdk/pull/510) [`ae7ddf4`](https://github.com/coinbase/cdp-sdk/commit/ae7ddf4137dab319cc4e80ed832477951c13d25c) Thanks [@0xRAG](https://github.com/0xRAG)! - Fixed bug in EOA signMessage method

## 1.40.0

### Minor Changes

- [#506](https://github.com/coinbase/cdp-sdk/pull/506) [`56af347`](https://github.com/coinbase/cdp-sdk/commit/56af347209a82cbdee10c09cd77403250da19d8f) Thanks [@milan-cb](https://github.com/milan-cb)! - Added optional EIP-8021 dataSuffix to prepareUserOperation and sendUserOperation

## 1.39.0

### Minor Changes

- [#499](https://github.com/coinbase/cdp-sdk/pull/499) [`af70f6e`](https://github.com/coinbase/cdp-sdk/commit/af70f6e64ca6fd3b5349db4e4295c5f726fa9c2d) Thanks [@marcin-cb](https://github.com/marcin-cb)! - Added createEndUser method to EndUser client

## 1.38.6

### Patch Changes

- [#492](https://github.com/coinbase/cdp-sdk/pull/492) [`60e6a1a`](https://github.com/coinbase/cdp-sdk/commit/60e6a1a5ae6da6b704c33fd7f72ee334108deb76) Thanks [@0xRAG](https://github.com/0xRAG)! - Replaced error-tracking wrappers with a WeakSet-based recursion guard to prevent memory leaks from strong references to wrapped instances.

## 1.38.5

### Patch Changes

- [#482](https://github.com/coinbase/cdp-sdk/pull/482) [`71a7184`](https://github.com/coinbase/cdp-sdk/commit/71a71844d8b39628632f59121d0cb61c7e951367) Thanks [@0xRAG](https://github.com/0xRAG)! - Improved error handling by surfacing UserInputValidationErrors, particularly when performing wallet operations that require a wallet secret
- Removed default audience claim from JWT generation

## 1.38.4

### Patch Changes

- [#462](https://github.com/coinbase/cdp-sdk/pull/462) [`8f5f7a4`](https://github.com/coinbase/cdp-sdk/commit/8f5f7a4d17d2e058ce01ea94864c756067c2d47d) Thanks [@sddioulde](https://github.com/sddioulde)! - Removed @solana/spl-token

## 1.38.3

### Patch Changes

- [#458](https://github.com/coinbase/cdp-sdk/pull/458) [`93410df`](https://github.com/coinbase/cdp-sdk/commit/93410df3e912066eed9fc9d7e6fe92f7c3775050) Thanks [@sddioulde](https://github.com/sddioulde)! - Fixed empty object hash in TS

## 1.38.2

### Patch Changes

- override dependency on bigint-buffer

## 1.38.1

### Patch Changes

- [#443](https://github.com/coinbase/cdp-sdk/pull/443) [`cc0df2d`](https://github.com/coinbase/cdp-sdk/commit/cc0df2d5f0f74081fbcc0ece8b31c3620bc472e2) Thanks [@jazz-cb](https://github.com/jazz-cb)! - Update dependencies with critical/high vulnerability

## 1.38.0

### Minor Changes

- [#440](https://github.com/coinbase/cdp-sdk/pull/440) [`46ca8e0`](https://github.com/coinbase/cdp-sdk/commit/46ca8e01799416dfb2d202957c94e77b223d2487) Thanks [@sammccord](https://github.com/sammccord)! - Added netUSDChange policy criteria to send+prepareUserOperation

## 1.37.0

### Minor Changes

- [#435](https://github.com/coinbase/cdp-sdk/pull/435) [`e03b68d`](https://github.com/coinbase/cdp-sdk/commit/e03b68dcb21352ebbadc4600d87d7e631efaba94) Thanks [@sddioulde](https://github.com/sddioulde)! - Added programId, solNetwork, and solMessage policy criteria

## 1.36.1

### Patch Changes

- [#427](https://github.com/coinbase/cdp-sdk/pull/427) [`f3c2e70`](https://github.com/coinbase/cdp-sdk/commit/f3c2e70dab1b3f7d70c2e906a6cd9137b111338c) Thanks [@0xRAG](https://github.com/0xRAG)! - Removed approval in transfer method for Smart Accounts and EOAs

## 1.36.0

### Minor Changes

- [#412](https://github.com/coinbase/cdp-sdk/pull/412) [`22348cd`](https://github.com/coinbase/cdp-sdk/commit/22348cd05bf214cfb2128569cc6d8bf13de1596f) Thanks [@sddioulde](https://github.com/sddioulde)! - Added solData criterion to policy engine

### Patch Changes

- [#411](https://github.com/coinbase/cdp-sdk/pull/411) [`4ab0bb5`](https://github.com/coinbase/cdp-sdk/commit/4ab0bb5a9c8568d889cb407199c9c02363a26185) Thanks [@0xRAG](https://github.com/0xRAG)! - Added check to validate smart account owner

- [#402](https://github.com/coinbase/cdp-sdk/pull/402) [`d8943db`](https://github.com/coinbase/cdp-sdk/commit/d8943dbebc771a31a9989876bcc6fb985e76df29) Thanks [@github-actions](https://github.com/apps/github-actions)! - Added network in ListSpendPermissions response

## 1.35.0

### Minor Changes

- [#379](https://github.com/coinbase/cdp-sdk/pull/379) [`3e5a0ba`](https://github.com/coinbase/cdp-sdk/commit/3e5a0ba7f3be43ad9a142bd91e9e26043d2eab19) Thanks [@sabrinahirani](https://github.com/sabrinahirani)! - Added support for swaps on optimism and arbitrum with code examples

- [#394](https://github.com/coinbase/cdp-sdk/pull/394) [`726b392`](https://github.com/coinbase/cdp-sdk/commit/726b3921b6e871539e1c9d708af255f5ba8178e4) Thanks [@rebelArtists](https://github.com/rebelArtists)! - Migrated listTokenBalances to use new data endpoint with significantly improved performance: <1sec data freshness, <500ms query latency, and 100% token balance completeness across all addresses on Base and Base Sepolia networks

- [#387](https://github.com/coinbase/cdp-sdk/pull/387) [`bae7b30`](https://github.com/coinbase/cdp-sdk/commit/bae7b30d97d44418ab4b18a06020c79f532add5b) Thanks [@sammccord](https://github.com/sammccord)! - Added additional network support for sendEvmTransaction and prepareUserOperation evmNetwork policy criteria

## 1.34.1

### Patch Changes

- [#388](https://github.com/coinbase/cdp-sdk/pull/388) [`f0523e6`](https://github.com/coinbase/cdp-sdk/commit/f0523e6c5f457dccb9ce3a4c87ca65f7cd86711c) Thanks [@github-actions](https://github.com/apps/github-actions)! - Update generated openapi client

- [#369](https://github.com/coinbase/cdp-sdk/pull/369) [`f0c9904`](https://github.com/coinbase/cdp-sdk/commit/f0c99041a227e248175ceabf32d3e631b0e24d46) Thanks [@avidreder](https://github.com/avidreder)! - Adds validateAccessToken method to CDP SDK

## 1.34.0

### Minor Changes

- [#376](https://github.com/coinbase/cdp-sdk/pull/376) [`47f3cf1`](https://github.com/coinbase/cdp-sdk/commit/47f3cf18b200a3a9c8b7539989d77c8d44695965) Thanks [@0xRAG](https://github.com/0xRAG)! - Promoted Spend Permissions out of experimental mode. For more info, see: https://docs.cdp.coinbase.com/wallet-api/v2/evm-features/spend-permissions

## 1.33.0

### Minor Changes

- [#355](https://github.com/coinbase/cdp-sdk/pull/355) [`07bb282`](https://github.com/coinbase/cdp-sdk/commit/07bb2822671b7592987e1bdb7a52015a78ff5d1d) Thanks [@sammccord](https://github.com/sammccord)! - Added netUSDChange to sign/sendEvmTransaction policy rules

## 1.32.0

### Minor Changes

- [#343](https://github.com/coinbase/cdp-sdk/pull/343) [`ce09b05`](https://github.com/coinbase/cdp-sdk/commit/ce09b056690d77eab289599182f883f6df77fad7) Thanks [@sddioulde](https://github.com/sddioulde)! - Added SendSolTransaction rule and updated SignSolTransaction rule with new criteria

## 1.31.1

### Patch Changes

- [#347](https://github.com/coinbase/cdp-sdk/pull/347) [`ad9f725`](https://github.com/coinbase/cdp-sdk/commit/ad9f725f5f4ba4e1dd8879433de0f271a4893af3) Thanks [@sddioulde](https://github.com/sddioulde)! - Added token symbol and name to EVM token balances response in TypeScript

## 1.31.0

### Minor Changes

- SendEvmTransaction support for new EVM networks - arbitrum, polygon, optimism, avalanche

## 1.30.0

### Minor Changes

- [#326](https://github.com/coinbase/cdp-sdk/pull/326) [`483beb3`](https://github.com/coinbase/cdp-sdk/commit/483beb391063293d4e8f6a0e6c3474aa596b00f9) Thanks [@0xRAG](https://github.com/0xRAG)! - Added sendTransaction method to SolanaAccount

### Patch Changes

- [#326](https://github.com/coinbase/cdp-sdk/pull/326) [`483beb3`](https://github.com/coinbase/cdp-sdk/commit/483beb391063293d4e8f6a0e6c3474aa596b00f9) Thanks [@0xRAG](https://github.com/0xRAG)! - Fixed solana signing methods return type to match the API

## 1.29.0

### Minor Changes

- [#292](https://github.com/coinbase/cdp-sdk/pull/292) [`9db681c`](https://github.com/coinbase/cdp-sdk/commit/9db681c54e60231588b7ebfab260d605c4c09187) Thanks [@sddioulde](https://github.com/sddioulde)! - Added Solana onramp

## 1.28.0

### Minor Changes

- [#304](https://github.com/coinbase/cdp-sdk/pull/304) [`d6363f6`](https://github.com/coinbase/cdp-sdk/commit/d6363f667457e172474c3aadcfb7cbdaadb536f2) Thanks [@sammccord](https://github.com/sammccord)! - Increased address criterion validation to 300 from 100

### Patch Changes

- [#309](https://github.com/coinbase/cdp-sdk/pull/309) [`ee7601c`](https://github.com/coinbase/cdp-sdk/commit/ee7601ce9700272162684435721f42bc9e0af3b5) Thanks [@sddioulde](https://github.com/sddioulde)! - Updated transfer to use SendSolanaTransaction

- [#299](https://github.com/coinbase/cdp-sdk/pull/299) [`d5e6e20`](https://github.com/coinbase/cdp-sdk/commit/d5e6e206d760e2b72d46ea9676d3a0b9306877b3) Thanks [@0xRAG](https://github.com/0xRAG)! - Fixed managed methods not being available when using custom RPC URLs with EVM server accounts

## 1.27.0

### Minor Changes

- [#291](https://github.com/coinbase/cdp-sdk/pull/291) [`2f91319`](https://github.com/coinbase/cdp-sdk/commit/2f91319c3e74a4d5a437222e16b4b891cda74a97) Thanks [@marcin-cb](https://github.com/marcin-cb)! - Added SendTransaction method to the Solana client

- [#293](https://github.com/coinbase/cdp-sdk/pull/293) [`da89fd1`](https://github.com/coinbase/cdp-sdk/commit/da89fd120f37788d9f917d0cc0969396fba98d78) Thanks [@0xRAG](https://github.com/0xRAG)! - Improved network error handling

## 1.26.0

### Minor Changes

- [#284](https://github.com/coinbase/cdp-sdk/pull/284) [`8f62c03`](https://github.com/coinbase/cdp-sdk/commit/8f62c039acebdee3bc2d40abe9fcb02f301d4b8d) Thanks [@0xRAG](https://github.com/0xRAG)! - Added signTypedData on EvmSmartAccount

### Patch Changes

- [#282](https://github.com/coinbase/cdp-sdk/pull/282) [`d125258`](https://github.com/coinbase/cdp-sdk/commit/d125258c2dcf3fe6104cf9df0290d9904c2019fb) Thanks [@sddioulde](https://github.com/sddioulde)! - Made solana mainnet default network for listTokenBalances

- [#281](https://github.com/coinbase/cdp-sdk/pull/281) [`8a8d687`](https://github.com/coinbase/cdp-sdk/commit/8a8d687e4410abe277f932afd19f0e19cc5a5bf6) Thanks [@0xRAG](https://github.com/0xRAG)! - Fixed network scoped server account transfer

## 1.25.0

### Minor Changes

- [#275](https://github.com/coinbase/cdp-sdk/pull/275) [`64073d0`](https://github.com/coinbase/cdp-sdk/commit/64073d09dc620117b25a3a981f7d52fa3b0db755) Thanks [@sddioulde](https://github.com/sddioulde)! - Added listTokenBalances to retrieve SOL and SPL token balances for a Solana account

## 1.24.0

### Minor Changes

- [#267](https://github.com/coinbase/cdp-sdk/pull/267) [`a0030c7`](https://github.com/coinbase/cdp-sdk/commit/a0030c7753611457082b13d953f09358ac1b3f29) Thanks [@superadi04](https://github.com/superadi04)! - Added updateSmartAccount to EvmClient

- [#270](https://github.com/coinbase/cdp-sdk/pull/270) [`dc7ee1a`](https://github.com/coinbase/cdp-sdk/commit/dc7ee1a07862f79f3db8541e6327b3f0fffb34fe) Thanks [@sammccord](https://github.com/sammccord)! - Added support for sendUserOperation, prepareUserOperation policy rules, and added policies to EVM Smart Account models

### Patch Changes

- [#271](https://github.com/coinbase/cdp-sdk/pull/271) [`ce4771c`](https://github.com/coinbase/cdp-sdk/commit/ce4771c95f52e11c1ab0911d9c49a52fbe3bac69) Thanks [@0xRAG](https://github.com/0xRAG)! - Added ability to pass address in getUserOperation on EvmClient

## 1.23.0

### Minor Changes

- [#264](https://github.com/coinbase/cdp-sdk/pull/264) [`09ce300`](https://github.com/coinbase/cdp-sdk/commit/09ce300a773d1b9b63c97677ee1a5e4e4ee27c60) Thanks [@0xRAG](https://github.com/0xRAG)! - Added support for policy creation on signTypedData operations

### Patch Changes

- [#262](https://github.com/coinbase/cdp-sdk/pull/262) [`d4039e9`](https://github.com/coinbase/cdp-sdk/commit/d4039e9d5b0910c601e649f60506559c9b6205b3) Thanks [@0xRAG](https://github.com/0xRAG)! - Update smartAccount#transfer type to include optional paymasterUrl

## 1.22.0

### Minor Changes

- [#250](https://github.com/coinbase/cdp-sdk/pull/250) [`a11ecd2`](https://github.com/coinbase/cdp-sdk/commit/a11ecd2ebb59a4a9d475323322cb40d9c40911f1) Thanks [@0xRAG](https://github.com/0xRAG)! - Swapped built-in crypto library for uncrypto in auth subpackage to allow it to work in Next.js Edge runtime

- [#251](https://github.com/coinbase/cdp-sdk/pull/251) [`57aa371`](https://github.com/coinbase/cdp-sdk/commit/57aa3717a9356f89031c1cf20c83f8b0f310dad7) Thanks [@suryatejamandadi-cb](https://github.com/suryatejamandadi-cb)! - Added ethereum mainnet support for the wallet fund and quoteFund operations for server/smart accounts

### Patch Changes

- [#194](https://github.com/coinbase/cdp-sdk/pull/194) [`b65c416`](https://github.com/coinbase/cdp-sdk/commit/b65c41678f717c1d25162cb8e2f1fb1f205b8051) Thanks [@0xRAG](https://github.com/0xRAG)! - Added check to ensure minimum required Node.js version

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
