import { Analytics } from "../analytics.js";
import { CdpOpenApiClient } from "../openapi-client/index.js";
import { version } from "../version.js";
import { EndUserClient } from "./end-user/endUser.js";
import { EvmClient } from "./evm/evm.js";
import { PoliciesClient } from "./policies/policies.js";
import { SolanaClient } from "./solana/solana.js";
import { VendoredClient } from "./vendored.js";
import { WebhooksClient } from "./webhooks/webhooks.js";

export interface CdpClientOptions {
  /** The API key ID. */
  apiKeyId?: string;
  /** The API key secret. */
  apiKeySecret?: string;
  /** The wallet secret. */
  walletSecret?: string;
  /** Whether to enable debugging. */
  debugging?: boolean;
  /** The host URL to connect to. */
  basePath?: string;
}

/**
 * The main client for interacting with the CDP API.
 */
export class CdpClient extends VendoredClient {
  /** Namespace containing all EVM methods. */
  public evm: EvmClient;

  /** Namespace containing all Solana methods. */
  public solana: SolanaClient;

  /** Namespace containing all Policies methods. */
  public policies: PoliciesClient;

  /** Namespace containing all end user methods. */
  public endUser: EndUserClient;

  /** Namespace containing all webhook methods. */
  public webhooks: WebhooksClient;

  /**
   * The CdpClient is the main class for interacting with the CDP API.
   *
   * There are a few required parameters that are configured in the [CDP Portal](https://portal.cdp.coinbase.com/projects/api-keys):
   * - **CDP Secret API Key** (`apiKeyId` & `apiKeySecret`): These are used to authenticate requests to the entire suite of
   *   APIs offered on Coinbase Developer Platform.
   *   [Read more about CDP API keys](https://docs.cdp.coinbase.com/get-started/docs/cdp-api-keys).
   * - **Wallet Secret** (`walletSecret`): This secret is used specifically to authenticate requests to `POST`, and `DELETE`
   *   endpoints in the EVM and Solana Account APIs.
   *
   * These parameters can be set as environment variables:
   * ```
   * CDP_API_KEY_ID=your-api-key-id
   * CDP_API_KEY_SECRET=your-api-key-secret
   * CDP_WALLET_SECRET=your-wallet-secret
   * ```
   *
   * Or passed as options to the constructor:
   *
   * ```typescript
   * const cdp = new CdpClient({
   *   apiKeyId: "your-api-key-id",
   *   apiKeySecret: "your-api-key-secret",
   *   walletSecret: "your-wallet-secret",
   * });
   * ```
   *
   * The CdpClient is namespaced by chain type: `evm` or `solana`.
   *
   * As an example, to create a new EVM account, use `cdp.evm.createAccount()`.
   *
   * To create a new Solana account, use `cdp.solana.createAccount()`.
   *
   * The CDP Secret API Key is not required to call public (unauthenticated) endpoints, such as
   * the x402 Bazaar discovery endpoints. A `CdpClient` may be constructed without credentials for
   * this purpose; calling an authenticated endpoint without credentials will raise a clear error.
   *
   * @param {CdpClientOptions} [options] - Configuration options for the CdpClient.
   */
  constructor(options: CdpClientOptions = {}) {
    if (Number(process.versions.node.split(".")[0]) < 19) {
      throw new Error(
        `
Node.js version ${process.versions.node} is not supported. CDP SDK requires Node.js version 19 or higher. Please upgrade your Node.js version to use the CDP SDK.
We recommend using https://github.com/Schniz/fnm for managing your Node.js version.
        `,
      );
    }

    const apiKeyId = options.apiKeyId ?? process.env.CDP_API_KEY_ID ?? process.env.CDP_API_KEY_NAME;
    const apiKeySecret = options.apiKeySecret ?? process.env.CDP_API_KEY_SECRET;
    const walletSecret = options.walletSecret ?? process.env.CDP_WALLET_SECRET;

    /*
     * apiKeyId/apiKeySecret are intentionally not required here: a CdpClient with no credentials
     * can still call public (unauthenticated) endpoints. Authenticated endpoints will raise a
     * clear error at request time if credentials are missing.
     */
    CdpOpenApiClient.configure({
      ...options,
      apiKeyId,
      apiKeySecret,
      walletSecret,
      source: "sdk",
      sourceVersion: version,
    });

    /*
     * Map CdpClient construction onto the generated CoinbaseApiClient convention.
     * This must run after configure() (so the axios instance is ready) and before
     * any `this` access below.
     */
    super({
      apiKeyId,
      apiKeySecret,
      walletSecret,
      basePath: options.basePath,
      debugging: options.debugging,
    });

    if (
      apiKeyId &&
      (process.env.DISABLE_CDP_ERROR_REPORTING !== "true" ||
        process.env.DISABLE_CDP_USAGE_TRACKING !== "true")
    ) {
      Analytics.identifier = apiKeyId;
    }

    this.evm = new EvmClient();
    this.solana = new SolanaClient();
    this.policies = new PoliciesClient();
    this.endUser = new EndUserClient();
    this.webhooks = new WebhooksClient();
  }
}
