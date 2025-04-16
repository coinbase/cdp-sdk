# CDP SDK Changelog

<!-- towncrier release notes start -->

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
