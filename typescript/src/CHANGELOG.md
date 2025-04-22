# CDP SDK Changelog

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
