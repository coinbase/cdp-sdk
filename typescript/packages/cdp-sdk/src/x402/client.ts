/*
 * CDP-powered x402 payment client.
 *
 * Provides a streamlined setup experience for making paid HTTP requests
 * using CDP wallets (Server Wallets or Smart Contract Wallets) and the CDP
 * hosted facilitator.
 */
import { x402Client } from "@x402/core/client";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { UptoEvmScheme } from "@x402/evm/upto/client";
import { registerExactSvmScheme } from "@x402/svm/exact/client";

import { createBalanceCheckHook } from "./balance-check.js";
import { CDP_EVM_RPC_URLS } from "./constants.js";
import { parseRpcUrlsFromEnv, resolveWalletConfig } from "./credentials.js";
import { provisionCdpAccounts } from "./wallets.js";

import type { CdpX402ClientConfig } from "./credentials.js";
import type { CdpClient } from "../client/cdp.js";
import type { Network, PaymentPayload, PaymentRequired } from "@x402/core/types";

/**
 * Result from eagerly creating a CDP x402 client.
 */
export interface CdpX402ClientResult {
  /** Configured `x402Client` with EVM and SVM schemes registered. */
  client: x402Client;
  /** The underlying `CdpClient` instance for direct CDP API access. */
  cdpClient: CdpClient;
  /** The EVM address used for payments. */
  evmAddress: `0x${string}`;
  /** The Solana account address. */
  svmAddress: string;
  /**
   * The owner account name. Only set when `walletConfig.type` is `"smart"`.
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
 * Provisions CDP accounts, registers EVM and SVM signers on the given client,
 * and wires the pre-flight balance check hook.
 *
 * @param client - The x402Client to register schemes on.
 * @param config - Optional credential and wallet configuration.
 * @returns Resolved signer setup with addresses and CDP client.
 */
async function setupCdpSigners(
  client: x402Client,
  config: CdpX402ClientConfig | undefined,
): Promise<CdpSignerSetup> {
  const walletConfig = resolveWalletConfig(config?.walletConfig);
  const { cdpClient, evmAddress, svmAddress, ownerWallet, evmSigner, svmSigner } =
    await provisionCdpAccounts(config, walletConfig);

  // Explicit config takes precedence over env var; both are merged over defaults.
  const resolvedRpcUrls = { ...parseRpcUrlsFromEnv(), ...config?.rpcUrls };
  const mergedRpcUrls: Record<string, { rpcUrl: string }> = {
    ...CDP_EVM_RPC_URLS,
    ...resolvedRpcUrls,
  } as Record<string, { rpcUrl: string }>;

  /*
   * UptoEvmScheme expects RPC URLs keyed by numeric EIP-155 chain ID.
   * Convert from our CAIP-2-keyed map before passing.
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
   * Register the balance pre-check before any other hook so it short-circuits
   * payment creation when the wallet lacks sufficient funds.
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

  return { cdpClient, evmAddress, svmAddress, ownerWallet };
}

/**
 * A Coinbase CDP-powered x402 client that initializes lazily on first payment.
 *
 * Extends `x402Client` with automatic wallet provisioning and scheme registration.
 * All configuration is read from environment variables by default and can be
 * overridden via explicit config. Wallet setup is deferred to the first
 * `createPaymentPayload` call, keeping construction synchronous and cheap.
 *
 * Wallet type is controlled by `walletConfig.type` (or `CDP_WALLET_TYPE` env var):
 * - `"eoa"` (default): CDP Server Wallet
 * - `"smart"`: CDP Smart Contract Wallet
 *
 * @example
 * ```typescript
 * import { CdpX402Client } from "@coinbase/cdp-sdk/x402";
 * import { wrapFetchWithPayment } from "@x402/fetch";
 *
 * const client = new CdpX402Client();
 * const fetchWithPayment = wrapFetchWithPayment(fetch, client);
 * const response = await fetchWithPayment("https://api.example.com/paid");
 * ```
 */
export class CdpX402Client extends x402Client {
  private readonly _config: CdpX402ClientConfig | undefined;
  private _initPromise: Promise<CdpSignerSetup> | null = null;

  /**
   * Constructs a CdpX402Client. Construction is synchronous — CDP accounts are
   * provisioned lazily on the first `createPaymentPayload` or `getEvmAddress` call.
   *
   * @param config - Optional configuration. All fields fall back to environment variables.
   */
  constructor(config?: CdpX402ClientConfig) {
    super();
    this._config = config;
  }

  /**
   * Creates a signed payment payload for the given requirements.
   *
   * Triggers lazy initialization on first call, then delegates to the parent
   * `x402Client.createPaymentPayload` implementation.
   *
   * @param paymentRequired - Payment requirements from the server's 402 response.
   * @returns A signed payment payload ready to be sent to the server.
   */
  override async createPaymentPayload(paymentRequired: PaymentRequired): Promise<PaymentPayload> {
    await this._ensureInitialized();
    return super.createPaymentPayload(paymentRequired);
  }

  /**
   * Returns the EVM address of the provisioned CDP wallet.
   *
   * Triggers lazy initialization on first call. Subsequent calls return
   * immediately once initialization is complete.
   *
   * @returns The EVM address (EOA or smart contract wallet address).
   */
  async getEvmAddress(): Promise<`0x${string}`> {
    const setup = await this._ensureInitialized();
    return setup.evmAddress;
  }

  /**
   * Returns the Solana address of the provisioned CDP wallet.
   *
   * Triggers lazy initialization on first call.
   *
   * @returns The Solana account address.
   */
  async getSvmAddress(): Promise<string> {
    const setup = await this._ensureInitialized();
    return setup.svmAddress;
  }

  /**
   * Returns the initialization promise, creating it on first call.
   *
   * Resets on failure so subsequent calls can retry after transient errors.
   *
   * @returns Promise that resolves to the initialized signer setup.
   */
  private _ensureInitialized(): Promise<CdpSignerSetup> {
    if (!this._initPromise) {
      this._initPromise = setupCdpSigners(this, this._config).catch(error => {
        // Reset so the next call can retry after a transient failure.
        this._initPromise = null;
        throw error;
      });
    }
    return this._initPromise;
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
 * const { client, evmAddress } = await createCdpX402Client();
 * console.log("Paying from:", evmAddress);
 * ```
 */
export async function createCdpX402Client(
  config?: CdpX402ClientConfig,
): Promise<CdpX402ClientResult> {
  const client = new x402Client();
  const { cdpClient, evmAddress, svmAddress, ownerWallet } = await setupCdpSigners(client, config);

  return {
    client,
    cdpClient,
    evmAddress,
    svmAddress,
    ownerWallet,
  };
}
