/* CDP credential resolution for the x402 client. */

/**
 * Wallet type for the CDP x402 client.
 *
 * - `"eoa"`: CDP Server Wallet (Externally Owned Account)
 * - `"smart"`: CDP Smart Contract Wallet (ERC-4337)
 */
export type WalletType = "eoa" | "smart";

/**
 * Wallet configuration for the CDP x402 client.
 *
 * All fields fall back to environment variables when omitted.
 */
export type WalletConfig =
  | {
      type: "eoa";
      /**
       * Named CDP account. Falls back to `CDP_ACCOUNT_NAME` env var.
       * Defaults to `"x402-client-wallet-1"`.
       */
      accountName?: string;
    }
  | {
      type: "smart";
      /**
       * Named CDP smart account. Falls back to `CDP_ACCOUNT_NAME` env var.
       * Defaults to `"x402-client-wallet-1"`.
       */
      accountName?: string;
      /**
       * Owner EOA account name for the smart wallet.
       * Falls back to `CDP_OWNER_ACCOUNT_NAME` env var.
       */
      ownerAccountName: string;
    };

/**
 * Configuration options for the CDP x402 client.
 *
 * All credential fields fall back to environment variables when omitted.
 * The constructor only stores config — accounts are resolved lazily on the
 * first payment call.
 */
export interface CdpX402ClientConfig {
  /** CDP API key ID. Falls back to `CDP_API_KEY_ID` env var. */
  apiKeyId?: string;
  /** CDP API key secret. Falls back to `CDP_API_KEY_SECRET` env var. */
  apiKeySecret?: string;
  /** CDP wallet secret for signing. Falls back to `CDP_WALLET_SECRET` env var. */
  walletSecret?: string;
  /**
   * Wallet configuration. Defaults to a CDP Server Wallet (EOA).
   * Individual fields fall back to environment variables when omitted.
   */
  walletConfig?: WalletConfig;
  /**
   * Disable the client-side pre-flight balance check before each payment.
   * When `false` (default), the client queries the CDP balance API and throws
   * `InsufficientFundsError` early when the balance is too low. Set `true` to skip.
   * Falls back to `CDP_DISABLE_PREFLIGHT_BALANCE_CHECK=true` env var.
   */
  disablePreflightBalanceCheck?: boolean;
  /**
   * Override the public JSON-RPC endpoints used for on-chain balance lookups
   * and payment signing, keyed by CAIP-2 network identifier.
   *
   * Merged over the built-in defaults — only supply the networks you want to
   * override. Explicit values here take precedence over `CDP_X402_RPC_URLS`.
   *
   * Falls back to the `CDP_X402_RPC_URLS` environment variable, which must be a
   * JSON object mapping CAIP-2 network IDs to URL strings:
   * `CDP_X402_RPC_URLS='{"eip155:8453":"https://base-mainnet.g.alchemy.com/v2/KEY"}'`
   *
   * @example
   * ```typescript
   * const client = new CdpX402Client({
   *   rpcUrls: {
   *     "eip155:8453": { rpcUrl: "https://base-mainnet.g.alchemy.com/v2/YOUR_KEY" },
   *   },
   * });
   * ```
   */
  rpcUrls?: Partial<Record<string, { rpcUrl: string }>>;
}

/** Resolved CDP credentials with all required fields present. */
export interface ResolvedCdpCredentials {
  apiKeyId: string;
  apiKeySecret: string;
  walletSecret: string;
}

/** Resolved wallet configuration with all required fields for the selected type. */
export interface ResolvedWalletConfig {
  type: WalletType;
  accountName: string;
  ownerAccountName?: string;
}

const DEFAULT_ACCOUNT_NAME = "x402-client-wallet-1";
const SUPPORTED_WALLET_TYPES: WalletType[] = ["eoa", "smart"];

/**
 * Parses the `CDP_X402_RPC_URLS` environment variable into the `rpcUrls` shape.
 *
 * The env var must be a flat JSON object mapping CAIP-2 network IDs to URL strings:
 * `CDP_X402_RPC_URLS='{"eip155:8453":"https://base-mainnet.g.alchemy.com/v2/KEY"}'`
 *
 * @throws {Error} If the env var is set but is not valid JSON or not an object.
 * @returns Parsed RPC URL map, or `undefined` if the env var is not set.
 */
export function parseRpcUrlsFromEnv(): Partial<Record<string, { rpcUrl: string }>> | undefined {
  const raw = process.env.CDP_X402_RPC_URLS;
  if (!raw) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      "CDP_X402_RPC_URLS must be valid JSON, e.g. " +
        '\'{"eip155:8453":"https://base-mainnet.g.alchemy.com/v2/KEY"}\'',
    );
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(
      "CDP_X402_RPC_URLS must be a JSON object mapping CAIP-2 network IDs to URL strings",
    );
  }
  return Object.fromEntries(
    Object.entries(parsed as Record<string, unknown>).map(([network, url]) => {
      if (typeof url !== "string") {
        throw new Error(`CDP_X402_RPC_URLS: value for "${network}" must be a string URL`);
      }
      return [network, { rpcUrl: url }];
    }),
  );
}

/**
 * Resolves the wallet type from a string, throwing for unsupported values.
 *
 * @param type - Raw wallet type string (e.g. from `CDP_WALLET_TYPE` env var).
 * @returns The resolved wallet type, defaulting to `"eoa"` when absent.
 */
function resolveWalletType(type: string | undefined): WalletType {
  if (!type) return "eoa";
  if (SUPPORTED_WALLET_TYPES.includes(type as WalletType)) {
    return type as WalletType;
  }
  throw new Error(
    `Unsupported wallet type "${type}". Supported values: ${SUPPORTED_WALLET_TYPES.join(", ")}.`,
  );
}

/**
 * Resolves wallet configuration from explicit config and environment variables.
 *
 * @param config - Optional wallet configuration to resolve.
 * @throws {Error} If required fields for the resolved wallet type are missing.
 * @returns Resolved wallet configuration with all required fields populated.
 */
export function resolveWalletConfig(config?: WalletConfig): ResolvedWalletConfig {
  const type = resolveWalletType(config?.type ?? process.env.CDP_WALLET_TYPE);
  const accountName = config?.accountName ?? process.env.CDP_ACCOUNT_NAME ?? DEFAULT_ACCOUNT_NAME;
  const ownerAccountName =
    type === "smart"
      ? ((config as { type: "smart"; ownerAccountName: string })?.ownerAccountName ??
        process.env.CDP_OWNER_ACCOUNT_NAME)
      : undefined;

  if (type === "smart" && !ownerAccountName) {
    throw new Error(
      'Missing required owner account name for wallet type "smart". ' +
        "Provide it via walletConfig.ownerAccountName or set the CDP_OWNER_ACCOUNT_NAME environment variable.",
    );
  }

  return { type, accountName, ownerAccountName };
}

/**
 * Resolves CDP credentials from explicit config or environment variables.
 *
 * @param config - Optional client configuration with credential overrides.
 * @throws {Error} If any required credential is missing.
 * @returns Resolved credentials with all required fields present.
 */
export function resolveCredentials(config?: CdpX402ClientConfig): ResolvedCdpCredentials {
  const apiKeyId = config?.apiKeyId ?? process.env.CDP_API_KEY_ID;
  const apiKeySecret = config?.apiKeySecret ?? process.env.CDP_API_KEY_SECRET;
  const walletSecret = config?.walletSecret ?? process.env.CDP_WALLET_SECRET;

  const missing: string[] = [];
  if (!apiKeyId) missing.push("CDP_API_KEY_ID");
  if (!apiKeySecret) missing.push("CDP_API_KEY_SECRET");
  if (!walletSecret) missing.push("CDP_WALLET_SECRET");

  if (missing.length > 0) {
    throw new Error(
      `Missing required CDP credentials: ${missing.join(", ")}. ` +
        "Provide them via config options or set the corresponding environment variables.",
    );
  }

  return {
    apiKeyId: apiKeyId!,
    apiKeySecret: apiKeySecret!,
    walletSecret: walletSecret!,
  };
}
