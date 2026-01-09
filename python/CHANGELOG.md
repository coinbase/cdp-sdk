# CDP SDK Changelog

<!-- towncrier release notes start -->

## [1.37.0] - 2026-01-09

### Features

- Added importEndUser to the end user client ([#545](https://github.com/coinbase/cdp-sdk/pull/545))

### Bugfixes

- Improved handling of ECDSA-formatted API keys. ([#546](https://github.com/coinbase/cdp-sdk/pull/546))


## [1.36.0] - 2026-01-08

### Features

- Added spend permissions for pre-generated smart accounts ([#541](https://github.com/coinbase/cdp-sdk/pull/541))


## [1.35.0] - 2025-12-08

### Features

- Added optional EIP-8021 dataSuffix to send_user_operation ([#506](https://github.com/coinbase/cdp-sdk/pull/506))


## [1.34.0] - 2025-12-04

### Features

- Added createEndUser method to EndUser client ([#499](https://github.com/coinbase/cdp-sdk/pull/499))


## [1.33.3] - 2025-11-21

### Bugfixes

- Replaced error-tracking wrappers with a WeakSet-based recursion guard to prevent memory leaks from strong references to wrapped instances. ([#494](https://github.com/coinbase/cdp-sdk/pull/494))


## [1.33.2] - 2025-11-03

- Removed default audience claim from JWT generation


## [1.33.1] - 2025-10-06

### Bugfixes

- Fixed python client retries ([#451](https://github.com/coinbase/cdp-sdk/pull/451))
- Fixed Solana mainnet USDC sends ([#465](https://github.com/coinbase/cdp-sdk/pull/465))


## [1.33.0] - 2025-09-23

### Features

- Added netUSDChange policy criteria to send+prepareUserOperation ([#440](https://github.com/coinbase/cdp-sdk/pull/440))

### Bugfixes

- Fixed uvloop compatibility issue ([#448](https://github.com/coinbase/cdp-sdk/pull/448))


## [1.32.0] - 2025-09-09

### Features

- Added programId, solNetwork, and solMessage policy criteria ([#435](https://github.com/coinbase/cdp-sdk/pull/435))


## [1.31.2] - 2025-09-05

### Bugfixes

- Support non-checksum addresses in transfers.

## [1.31.1] - 2025-09-03

### Bugfixes

- Removed approval in transfer method for Smart Accounts and EOAs ([#427](https://github.com/coinbase/cdp-sdk/pull/427))


## [1.31.0] - 2025-08-19

### Features

- Added solData criterion to policy engine ([#415](https://github.com/coinbase/cdp-sdk/pull/415))

### Bugfixes

- Added check to validate smart account owner ([#411](https://github.com/coinbase/cdp-sdk/pull/411))

### Misc

- [#402](https://github.com/coinbase/cdp-sdk/pull/402)


## [1.30.0] - 2025-08-13

### Features

- Added access token validation to SDK ([#389](https://github.com/coinbase/cdp-sdk/pull/389))
- Migrated listTokenBalances to use new data endpoint with significantly improved performance: <1sec data freshness, <500ms query latency, and 100% token balance completeness across all addresses on Base and Base Sepolia networks ([#394](https://github.com/coinbase/cdp-sdk/pull/394))
- Added additional network support for sendEvmTransaction and prepareUserOperation evmNetwork policy criteria ([#1446](https://github.com/coinbase/cdp-sdk/pull/1446))

### Misc

- [#388](https://github.com/coinbase/cdp-sdk/pull/388)


## [1.29.1] - 2025-08-09

### Bugfixes

- Added discovery layer disclaimer notice to x402 subpackage


## [1.29.0] - 2025-08-07

### Features

- Promoted Spend Permissions out of experimental mode. For more info, see: https://docs.cdp.coinbase.com/wallet-api/v2/evm-features/spend-permissions ([#376](https://github.com/coinbase/cdp-sdk/pull/376))


## [1.28.0] - 2025-08-05

### Features

- Added netUSDChange criteria for sign/sendEvmTransaction rules ([#1218](https://github.com/coinbase/cdp-sdk/pull/1218))


## [1.27.0] - 2025-08-04

### Features

- Added SendSolTransaction rule and updated SignSolTransaction rule with new criteria ([#344](https://github.com/coinbase/cdp-sdk/pull/344))


## [1.26.0] - 2025-07-31

### Features

- SendEvmTransaction support for new EVM networks - arbitrum, polygon, optimism, avalanche ([#338](https://github.com/coinbase/cdp-sdk/pull/338))

### Bugfixes

- Fixed evmData in python request/response transformer ([#317](https://github.com/coinbase/cdp-sdk/pull/317))


## [1.25.0] - 2025-07-23

### Features

- Added Solana onramp ([#294](https://github.com/coinbase/cdp-sdk/pull/294))

### Bugfixes

- Updated transfer to use SendSolanaTransaction ([#309](https://github.com/coinbase/cdp-sdk/pull/309))


## [1.24.0] - 2025-07-18

### Features

- Added sendTransaction function for Solana accounts ([#291](https://github.com/coinbase/cdp-sdk/pull/291))
- Improved network error handling ([#293](https://github.com/coinbase/cdp-sdk/pull/293))

### Bugfixes

- Gracefully handle closed client connections ([#298](https://github.com/coinbase/cdp-sdk/pull/298))


## [1.23.0] - 2025-07-16

### Features

- Added signTypedData on EvmSmartAccount ([#284](https://github.com/coinbase/cdp-sdk/pull/284))

### Bugfixes

- Made solana mainnet default network for listTokenBalances ([#282](https://github.com/coinbase/cdp-sdk/pull/282))


## [1.22.0] - 2025-07-10

### Features

- Added list_token_balances on Solana to get SOL and SPL token balances ([#277](https://github.com/coinbase/cdp-sdk/pull/277))


## [1.21.0] - 2025-07-09

### Features

- Added updateSmartAccount to EvmClient ([#267](https://github.com/coinbase/cdp-sdk/pull/267))
- Added sendUserOperation, prepareUserOperation policy rules and EVM Smart Account policies ([#270](https://github.com/coinbase/cdp-sdk/pull/270))


## [1.20.0] - 2025-07-08

### Features

- Added support for policy creation on signTypedData operations ([#264](https://github.com/coinbase/cdp-sdk/pull/264))


## [1.19.0] - 2025-07-01

### Features

- Added ethereum mainnet support for wallet fund and quote_fund operations ([#251](https://github.com/coinbase/cdp-sdk/pull/251))


## [1.18.0] - 2025-06-27

### Features

- Added importAccount method for Solana client ([#244](https://github.com/coinbase/cdp-sdk/pull/244))

### Bugfixes

- Fixed EvmLocalAccount sign typed data compatibility with eth-account.

  - Convert bytes32 to hex string to make it serializable
  - Include EIP712 domain if missing from types
  - Return SignedMessage

  ([#246](https://github.com/coinbase/cdp-sdk/pull/246))


## [1.17.0] - 2025-06-26

### Features

- Added ethereum & ethereum-sepolia to SendEvmTransaction ([#234](https://github.com/coinbase/cdp-sdk/pull/234))


## [1.16.0] - 2025-06-25

### Features

- Added support for EvmDataCriterion in policies, which can restrict smart contract interactions ([#220](https://github.com/coinbase/cdp-sdk/pull/220))

### Bugfixes

- Hash req body in wallet jwt claims ([#212](https://github.com/coinbase/cdp-sdk/pull/212))


## [1.15.0] - 2025-06-18

### Features

- Added the CDP facilitator configuration export for the x402 payment protocol


## [1.14.0] - 2025-06-17

### Features

- **Added swap support for EVM Smart Accounts** ([#200](https://github.com/coinbase/cdp-sdk/pull/200)):
  
    - Added the following EVM Smart Account methods: `evm_smart_account.quote_swap()`, `evm_smart_account.swap()`
    - Added `swap_quote.execute()` method for executing swap quotes generated for EVM Smart Accounts

- Added idempotency support for get_swap_price and create_swap_quote ([#200](https://github.com/coinbase/cdp-sdk/pull/200))

### Bugfixes

  - Fixed usage of optional idempotency keys for one-line swap approach ([#200](https://github.com/coinbase/cdp-sdk/pull/200))

## [1.13.0] - 2025-06-13

### Features

- Added get_or_create_smart_account and added optional name argument to get_smart_account and create_smart_account ([#198](https://github.com/coinbase/cdp-sdk/pull/198))


## [1.12.0] - 2025-06-12

### Features

- Added evm and solana account export by address or name ([#195](https://github.com/coinbase/cdp-sdk/pull/195))

### Bugfixes

- Log response body for unexpected error scenarios ([#192](https://github.com/coinbase/cdp-sdk/pull/192))


## [1.11.1] - 2025-06-04

### Bugfixes

- **Fixed taker parameter logic to align Python SDK with TypeScript SDK behavior:**

  - **Removed `taker` parameter from `SwapOptions`** - Account swap methods now always use the account address as taker, preventing confusion about which address receives the swapped tokens
  - **Updated `account.swap()`** - Always uses `self.address` as taker instead of allowing custom taker via SwapOptions  
  - **Updated `account.quote_swap()`** - Always uses `self.address` as taker (previously could be overridden)
  - **Maintained explicit `taker` requirement** - Global methods (`cdp.evm.get_swap_price()`, `cdp.evm.create_swap_quote()`) still require explicit taker parameter for flexibility
  - **Updated examples and documentation** - All examples now reflect the simplified taker logic

  This change provides a cleaner API where account-level convenience methods always swap to the account address, while global methods require explicit specification for external wallet integrations.

  ([#182](https://github.com/coinbase/cdp-sdk/pull/182))


## [1.11.0] - 2025-06-03

### Features

- Added comprehensive token swap functionality for EVM accounts

  - Added multiple swap approaches:
    - Direct swap with `account.swap()` using `SwapOptions` with parameters
    - Get pricing information with `get_swap_price()` 
    - Create quotes with `create_swap_quote()` and execute separately
    - Account convenience method `account.quote_swap()` that auto-sets taker
  - Added ability to execute quotes directly with `quote.execute()` when `from_account` is provided
  - Support for swapping tokens using contract addresses
  - Configurable slippage protection (slippage_bps) with automatic optimal routing
  - Returns `SwapUnavailableResult` when liquidity is insufficient
  - Consistent parameter naming: `from_token`, `to_token`, `from_amount`
  - Support for multiple amount formats (decimal strings and atomic units)
  - Comprehensive test coverage including unit tests and E2E tests
  - Updated documentation with examples for all swap patterns

  ([#160](https://github.com/coinbase/cdp-sdk/pull/160))
- Added support for signEvmHash and signEvmMessage policy rules ([#173](https://github.com/coinbase/cdp-sdk/pull/173))


## [1.10.0] - 2025-05-30

### Features

- Added support for funding an EVM account with eth or usdc using a linked debit card ([#156](https://github.com/coinbase/cdp-sdk/pull/156))
- Added eth-account compatibility ([#162](https://github.com/coinbase/cdp-sdk/pull/162))
- Added ability to create account with policy ([#166](https://github.com/coinbase/cdp-sdk/pull/166))


## [1.9.0] - 2025-05-29

### Features

- Added import account to evm client ([#157](https://github.com/coinbase/cdp-sdk/pull/157))


## [1.8.1] - 2025-05-16

### Misc

- [#151](https://github.com/coinbase/cdp-sdk/pull/151)


## [1.8.0] - 2025-05-15

### Features

- Added policy CRUD methods ([#145](https://github.com/coinbase/cdp-sdk/pull/145))
- Added updateAccount to evm and solana clients ([#146](https://github.com/coinbase/cdp-sdk/pull/146))


## [1.7.0] - 2025-05-14

### Features

- Added transfer method to Solana account to easily send tokens on Solana ([#136](https://github.com/coinbase/cdp-sdk/pull/136))
- Updated Transfer API to allow users to wait for receipt and pass in a parsed amount to transfer ([#137](https://github.com/coinbase/cdp-sdk/pull/137))


## [1.6.0] - 2025-05-09

### Features

- Added support for eip-712 signing ([#132](https://github.com/coinbase/cdp-sdk/pull/132))
- Added SolanaAccount with convenience methods to easily perform actions on a returned account ([#135](https://github.com/coinbase/cdp-sdk/pull/135))


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
