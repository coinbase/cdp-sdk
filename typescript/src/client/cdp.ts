import { CdpOpenApiClient } from "../openapi-client";
import { version } from "../../package.json";
import { EvmClient } from "./evm";
import { SolanaClient } from "./solana";

interface CdpClientOptions {
  /** The API key ID. */
  apiKeyId: string;
  /** The API key secret. */
  apiKeySecret: string;
  /** The wallet secret. */
  walletSecret: string;
  /** Whether to enable debugging. */
  debugging?: boolean;
  /** The host URL to connect to. */
  basePath?: string;
}

/**
 * The main client for interacting with the CDP API.
 */
export class CdpClient {
  /** Namespace containing all EVM methods. */
  public evm: EvmClient;

  /** Namespace containing all Solana methods. */
  public solana: SolanaClient;

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
   * The CdpClient is namespaced by chain type: `evm` or `solana`.
   *
   * As an example, to create a new EVM account, use `cdp.evm.createAccount()`.
   *
   * To create a new Solana account, use `cdp.solana.createAccount()`.
   *
   * @param {CdpClientOptions} options - Configuration options for the CdpClient.
   */
  constructor(options: CdpClientOptions) {
    CdpOpenApiClient.configure({
      ...options,
      source: "sdk",
      sourceVersion: version,
    });

    this.evm = new EvmClient();
    this.solana = new SolanaClient();
  }
}
