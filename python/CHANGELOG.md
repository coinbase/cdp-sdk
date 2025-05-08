# CDP SDK Changelog

<!-- towncrier release notes start -->

## [1.5.0] - 2025-05-07

### Features

- Added additional options to transfer methods ([#105](https://github.com/coinbase/cdp-sdk/pull/105)):

  - Added `paymaster_url` and `wait_options` to EvmSmartAccount.transfer
  - Added `wait_options` to EvmAccount.transfer

  
- Added account actions for evm server and smart accounts ([#114](https://github.com/coinbase/cdp-sdk/pull/114))


## [1.4.0] - 2025-05-02

### Features

- Added transfer methods to EvmAccount and EvmSmartAccount ([#95](https://github.com/coinbase/cdp-sdk/pull/95))
- Added a get_or_create_account function to the EVM and Solana clients ([#98](https://github.com/coinbase/cdp-sdk/pull/98))


## [1.3.0] - 2025-04-29

### Features

- Updated send_transaction to allow omission of nonce and gas parameters, deferring to Coinbase API to fill these in ([#86](https://github.com/coinbase/cdp-sdk/pull/86))
- Added the ability to generate JWTs intended for Websocket connections
- Added the ability to pass "audience" JWT claim as an optional param ([#75](https://github.com/coinbase/cdp-sdk/pull/75))


## [1.2.2] - 2025-04-28

### Bugfixes

- Fix circular dependency when importing cdp-sdk ([#82](https://github.com/coinbase/cdp-sdk/pull/82))


## [1.2.1] - 2025-04-24

### Patch Changes

- This patch contains a README update to accomodate the new home for CDP SDK examples.

## [1.2.0] - 2025-04-23

### Features

- Added list_token_balances to the evm client to retrieve ERC-20 and native token balances for an address on a given network. ([#55](https://github.com/coinbase/cdp-sdk/pull/55))
- Added send_transaction to the evm client to sign and send a transaction on a given network. ([#58](https://github.com/coinbase/cdp-sdk/pull/58))

### Misc

- [#56](https://github.com/coinbase/cdp-sdk/pull/56)

## [1.1.1] - 2025-04-17

### Bugfixes

- Correctly implement aenter and aexit on CdpClient ([#43](https://github.com/coinbase/cdp-sdk/pull/43))

## [1.1.0] - 2025-04-16

### Features

- Add support for configuring `CdpClient` via environment variables. ([#30](https://github.com/coinbase/cdp-sdk/pull/30))

  Developers can now simply set the following environment variables in their shell:

  ```bash
  export CDP_API_KEY_ID=your-api-key-id
  export CDP_API_KEY_SECRET=your-api-key-secret
  export CDP_WALLET_SECRET=your-wallet-secret
  ```

  And configure the `CdpClient` like so:

  ```python
  from cdp import CdpClient

  cdp = CdpClient()
  ```

  Or, load from a `.env` file:

  ```bash
  # .env
  CDP_API_KEY_ID=your-api-key-id
  CDP_API_KEY_SECRET=your-api-key-secret
  CDP_WALLET_SECRET=your-wallet-secret
  ```

  And configure the `CdpClient` like so:

  ```python
  from cdp import CdpClient
  from dotenv import load_dotenv

  load_dotenv()

  cdp = CdpClient()
  ```

## [1.0.1] - 2025-04-14

### Features

- Initial release of the CDP SDK.
