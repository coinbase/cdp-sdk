/**
 * CDP credential resolution for x402 clients.
 */
import { type WalletConfig, resolveWalletType } from "../wallets/config.js";

import type { SpendControls } from "../guardrails/types.js";

/**
 * Configuration options for the CDP x402 client.
 */
export interface CdpX402ClientConfig {
  /** CDP API key ID. Falls back to CDP_API_KEY_ID env var. */
  apiKeyId?: string;
  /** CDP API key secret. Falls back to CDP_API_KEY_SECRET env var. */
  apiKeySecret?: string;
  /**
   * CDP wallet secret for signing operations. Falls back to CDP_WALLET_SECRET env var.
   */
  walletSecret?: string;
  /**
   * Wallet configuration. Defaults to a CDP Server Wallet (EOA).
   * Individual fields fall back to environment variables when omitted.
   */
  walletConfig?: WalletConfig;
  /**
   * Optional SDK-managed spend controls. When set, the client wires per-payment
   * caps, cumulative caps with rolling windows, allow-lists for networks /
   * assets / payees, and an `onApproachingLimit` notifier on top of the
   * underlying `x402Client`.
   */
  spendControls?: SpendControls;
  /**
   * Disable the client-side pre-flight balance check that runs before each
   * payment. When `false` (the default), the client queries the CDP balance
   * API for the wallet's holdings of the requested asset on the requested
   * network and throws `InsufficientFundsError` early when the balance is
   * below the amount the server requires. Set to `true` to skip the check.
   * Falls back to `CDP_DISABLE_PREFLIGHT_BALANCE_CHECK=true` env var.
   */
  disablePreflightBalanceCheck?: boolean;
  /**
   * Override the public JSON-RPC endpoints used for on-chain balance lookups
   * and payment signing, keyed by CAIP-2 network identifier.
   */
  rpcUrls?: Partial<Record<string, { rpcUrl: string }>>;
}

/**
 * Resolved CDP credentials with all required fields present.
 */
export interface ResolvedCdpCredentials {
  apiKeyId: string;
  apiKeySecret: string;
  walletSecret: string;
}

/**
 * Resolves CDP credentials from explicit config or environment variables.
 * Explicit config always takes precedence over environment variables.
 *
 * @param config
 * @throws {Error} If any required credential is missing.
 */
export function resolveCredentials(config?: CdpX402ClientConfig): ResolvedCdpCredentials {
  resolveWalletType(config?.walletConfig?.type ?? process.env.CDP_WALLET_TYPE);

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
