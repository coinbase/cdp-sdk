/**
 * CDP-powered x402 payment client.
 *
 * Provides a streamlined setup experience for making paid HTTP requests
 * using CDP wallets (Server Wallets or Smart Contract Wallets) and the CDP
 * hosted facilitator.
 *
 * The easiest path is `CdpX402Client` — a drop-in replacement for
 * `x402Client` that initializes lazily on the first payment, reading all
 * configuration from environment variables:
 *
 * ```typescript
 * import { CdpX402Client } from "@coinbase/cdp-sdk/x402";
 *
 * const client = new CdpX402Client();
 * const fetchWithPayment = client.wrapFetch();
 * const response = await fetchWithPayment("https://api.example.com/paid-endpoint");
 * ```
 *
 * For explicit control, use `createCdpX402Client`:
 *
 * ```typescript
 * import { createCdpX402Client } from "@coinbase/cdp-sdk/x402";
 *
 * const { client, evmAddress } = await createCdpX402Client({
 *   walletConfig: { type: "cdp-smart", ownerAccountName: "my-owner" },
 * });
 * ```
 *
 * @packageDocumentation
 */

import { x402Client } from "@x402/core/client";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { UptoEvmScheme } from "@x402/evm/upto/client";
import { registerExactSvmScheme } from "@x402/svm/exact/client";

import { createBalanceCheckHook } from "./balance-check.js";
import { CdpClient } from "../../client/cdp.js";
import { CDP_EVM_RPC_URLS } from "../../networks/index.js";
import { type CdpX402ClientConfig } from "../credentials/index.js";
import { applySpendControls } from "../guardrails/apply.js";
import { wrapFetchWithPayment } from "../guardrails/wrap-fetch.js";
import { resolveWalletConfig, type ResolvedWalletConfig } from "../wallets/config.js";
import { provisionCdpAccounts } from "../wallets/provision.js";

import type { Network, PaymentRequired, PaymentPayload } from "@x402/core/types";

/**
 * Parses the `CDP_RPC_URLS` environment variable into the same shape as
 * `CdpX402ClientConfig.rpcUrls`. The env var must be a flat JSON object
 * mapping CAIP-2 network IDs to URL strings, e.g.:
 * `CDP_RPC_URLS='{"eip155:8453":"https://base-mainnet.g.alchemy.com/v2/KEY"}'`
 *
 * @throws {Error} If the env var is set but is not valid JSON or not an object.
 */
function parseRpcUrlsFromEnv(): Partial<Record<string, { rpcUrl: string }>> | undefined {
  const raw = process.env.CDP_RPC_URLS;
  if (!raw) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      "CDP_RPC_URLS must be valid JSON, e.g. " +
        '\'{"eip155:8453":"https://base-mainnet.g.alchemy.com/v2/KEY"}\'',
    );
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("CDP_RPC_URLS must be a JSON object mapping CAIP-2 network IDs to URL strings");
  }
  return Object.fromEntries(
    Object.entries(parsed as Record<string, unknown>).map(([network, url]) => {
      if (typeof url !== "string") {
        throw new Error(`CDP_RPC_URLS: value for "${network}" must be a string URL`);
      }
      return [network, { rpcUrl: url }];
    }),
  );
}

/**
 * Result from creating a CDP x402 client.
 */
export interface CdpX402ClientResult {
  /** Configured x402Client with EVM and SVM schemes registered. */
  client: x402Client;
  /** The underlying CdpClient instance for direct CDP API access. */
  cdpClient: CdpClient;
  /** The EVM address used for payments. */
  evmAddress: `0x${string}`;
  /** The Solana account address. */
  svmAddress: string;
  /**
   * The owner account name. Only set when walletConfig.type is "cdp-smart".
   * The owner signs EIP-712 typed data on behalf of the smart account.
   */
  ownerWallet?: string;
}

type CdpSignerSetup = {
  cdpClient: CdpClient;
  evmAddress: `0x${string}`;
  svmAddress: string;
  ownerWallet?: string;
};

/**
 * Provisions CDP accounts via `provisionCdpAccounts`, registers EVM and SVM
 * signers on the given x402 client, and wires balance-check and spend-control
 * hooks.
 *
 * @param client
 * @param config
 * @param walletConfig
 */
async function setupCdpSigners(
  client: x402Client,
  config: CdpX402ClientConfig | undefined,
  walletConfig: ResolvedWalletConfig,
): Promise<CdpSignerSetup> {
  const { cdpClient, evmAddress, svmAddress, ownerWallet, evmSigner, svmSigner } =
    await provisionCdpAccounts(config, walletConfig);

  // Explicit config takes precedence over env var; both are merged over defaults.
  const resolvedRpcUrls = { ...parseRpcUrlsFromEnv(), ...config?.rpcUrls };
  const mergedRpcUrls: Record<string, { rpcUrl: string }> = {
    ...CDP_EVM_RPC_URLS,
    ...resolvedRpcUrls,
  } as Record<string, { rpcUrl: string }>;

  /*
   * UptoEvmScheme (external library) expects RPC URLs keyed by numeric EIP-155
   * chain ID. Convert from our CAIP-2-keyed map before passing.
   */
  const uptoRpcUrls: Record<number, { rpcUrl: string }> = {};
  for (const [caip2, cfg] of Object.entries(mergedRpcUrls)) {
    const [namespace, chainId] = caip2.split(":");
    if (namespace === "eip155" && chainId) uptoRpcUrls[Number(chainId)] = cfg;
  }

  registerExactEvmScheme(client, { signer: evmSigner });
  registerExactSvmScheme(client, { signer: svmSigner });
  client.register("eip155:*" as Network, new UptoEvmScheme(evmSigner, uptoRpcUrls));

  /*
   * Register the balance pre-check before any other before-hook so it
   * short-circuits payment creation before spend trackers anticipatorily
   * record the (about-to-fail) spend. Before-hook errors do not run failure
   * hooks, so a later-registered balance check would leak a phantom spend
   * entry on the tracker.
   */
  const disablePreflightBalanceCheck =
    config?.disablePreflightBalanceCheck ??
    process.env.CDP_DISABLE_PREFLIGHT_BALANCE_CHECK === "true";
  if (!disablePreflightBalanceCheck) {
    client.onBeforePaymentCreation(
      createBalanceCheckHook({
        cdpClient,
        evmAddress,
        svmAddress,
        rpcUrls: resolvedRpcUrls,
      }),
    );
  }

  // Wire after schemes so the policy sees all registered networks.
  if (config?.spendControls) {
    applySpendControls(client, config.spendControls);
  }

  return { cdpClient, evmAddress, svmAddress, ownerWallet };
}

/**
 * A Coinbase CDP-powered x402 client that initializes lazily on first payment.
 *
 * Extends `x402Client` with automatic wallet provisioning and scheme registration.
 * All configuration is read from environment variables by default and can be
 * overridden via explicit config. Wallet setup deferred to the first
 * `createPaymentPayload` call, keeping construction synchronous and cheap.
 *
 * Wallet type is controlled by `walletConfig.type` (or `CDP_WALLET_TYPE` env var):
 * - `"cdp-eoa"` (default): CDP Server Wallet
 * - `"cdp-smart"`: CDP Smart Contract Wallet
 *
 * @example
 * ```typescript
 * // Reads CDP_WALLET_TYPE, CDP_API_KEY_*, CDP_WALLET_SECRET from env
 * import { CdpX402Client } from "@coinbase/cdp-sdk/x402";
 * const client = new CdpX402Client();
 * const fetchWithPayment = client.wrapFetch();
 * const response = await fetchWithPayment("https://api.example.com/paid");
 * ```
 *
 * @example
 * ```typescript
 * // Explicit Smart Contract Wallet config
 * const client = new CdpX402Client({
 *   walletConfig: { type: "cdp-smart", ownerAccountName: "my-owner" },
 * });
 * ```
 */
export class CdpX402Client extends x402Client {
  private readonly _config: CdpX402ClientConfig | undefined;
  private _initPromise: Promise<void> | null = null;

  /**
   *
   * @param config
   */
  constructor(config?: CdpX402ClientConfig) {
    super();
    this._config = config;
  }

  /**
   *
   */
  private async _initialize(): Promise<void> {
    const walletConfig = resolveWalletConfig(this._config?.walletConfig);
    await setupCdpSigners(this, this._config, walletConfig);
  }

  /**
   *
   */
  private _ensureInitialized(): Promise<void> {
    if (!this._initPromise) {
      this._initPromise = this._initialize().catch(error => {
        // Reset so the next call can retry after a transient failure.
        this._initPromise = null;
        throw error;
      });
    }
    return this._initPromise;
  }

  /**
   *
   * @param paymentRequired
   */
  override async createPaymentPayload(paymentRequired: PaymentRequired): Promise<PaymentPayload> {
    await this._ensureInitialized();
    return super.createPaymentPayload(paymentRequired);
  }

  /**
   * Return a settlement-aware fetch function for making paid HTTP requests.
   *
   * The returned function handles 402 responses automatically, creates payment
   * payloads, and confirms or rolls back the provisional spend record based on
   * the server's `PAYMENT-RESPONSE` header — ensuring spend controls reflect
   * only payments that actually settled on-chain.
   *
   * @param fetchFn - The fetch implementation to wrap. Defaults to
   *   `globalThis.fetch` when omitted.
   * @returns A wrapped fetch function with the same signature as
   *   `globalThis.fetch`.
   *
   * @example
   * ```typescript
   * const client = new CdpX402Client();
   * const fetchWithPayment = client.wrapFetch();
   * const response = await fetchWithPayment("https://api.example.com/paid");
   * ```
   */
  wrapFetch(
    fetchFn: typeof globalThis.fetch = globalThis.fetch,
  ): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
    return wrapFetchWithPayment(fetchFn, this);
  }
}

/**
 * Creates a fully configured CDP x402 client, eagerly provisioning wallets.
 *
 * Use this when you need the wallet address(es) before making any payments
 * (e.g. to fund the wallet first). For most use cases, prefer `CdpX402Client`
 * which defers initialization to the first payment.
 *
 * @param config - Optional configuration. All fields fall back to env vars.
 * @returns A configured client plus wallet addresses.
 *
 * @example
 * ```typescript
 * // EOA (default)
 * const { client, evmAddress } = await createCdpX402Client();
 *
 * // Smart Contract Wallet
 * const { client, evmAddress, ownerWallet } = await createCdpX402Client({
 *   walletConfig: { type: "cdp-smart", ownerAccountName: "my-owner" },
 * });
 * ```
 */
export async function createCdpX402Client(
  config?: CdpX402ClientConfig,
): Promise<CdpX402ClientResult> {
  const walletConfig = resolveWalletConfig(config?.walletConfig);
  const client = new x402Client();

  const { cdpClient, evmAddress, svmAddress, ownerWallet } = await setupCdpSigners(
    client,
    config,
    walletConfig,
  );

  return {
    client,
    cdpClient,
    evmAddress,
    svmAddress,
    ownerWallet,
  };
}
