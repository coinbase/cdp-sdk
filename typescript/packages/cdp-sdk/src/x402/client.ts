/*
 * CDP-powered x402 payment client.
 *
 * CdpX402Client is a drop-in extension of x402Client that auto-provisions
 * CDP-managed wallets (EVM EOA or Smart Contract Wallet + Solana), registers
 * payment schemes and wires spend controls.
 * All configuration is read from environment variables by default.
 */
import { x402Client } from "@x402/core/client";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { UptoEvmScheme } from "@x402/evm/upto/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { ExactSvmScheme, registerExactSvmScheme } from "@x402/svm/exact/client";

import {
  cdpSolanaAccountToSvmSigner,
  fromCdpEvmAccount,
  fromCdpSmartWallet,
} from "./account-signers.js";
import { CDP_EVM_RPC_URLS } from "./constants.js";
import { CdpClient } from "../client/cdp.js";
import { applySpendControls } from "./guardrails/apply.js";

import type { SpendControls } from "./guardrails/types.js";
import type { Network, PaymentPayload, PaymentRequired } from "@x402/core/types";

/** Wallet type for CDP Server Wallet (EOA) or Smart Contract Wallet. */
type WalletType = "eoa" | "smart";

/**
 * Wallet configuration for the CDP x402 client.
 */
export type WalletConfig =
  | {
      /** CDP Server Wallet (EOA). Default when `type` is omitted. */
      type: "eoa";
      /**
       * Named CDP account. Falls back to `CDP_ACCOUNT_NAME` env var.
       * Defaults to `"x402-client-wallet-1"`.
       */
      accountName?: string;
    }
  | {
      /** CDP Smart Contract Wallet. */
      type: "smart";
      /**
       * Named CDP smart account. Falls back to `CDP_ACCOUNT_NAME` env var.
       * Defaults to `"x402-client-wallet-1"`.
       */
      accountName?: string;
      /**
       * Owner EOA account name. Falls back to `CDP_OWNER_ACCOUNT_NAME` env var.
       * Required for `"smart"` type.
       */
      ownerAccountName: string;
    };

/**
 * Configuration for {@link CdpX402Client}.
 */
export interface CdpX402ClientConfig {
  /** CDP API key ID. Falls back to `CDP_API_KEY_ID` env var. */
  apiKeyId?: string;
  /** CDP API key secret. Falls back to `CDP_API_KEY_SECRET` env var. */
  apiKeySecret?: string;
  /** CDP wallet secret. Falls back to `CDP_WALLET_SECRET` env var. */
  walletSecret?: string;
  /**
   * Wallet configuration. Defaults to `{ type: "eoa" }`.
   * Wallet type falls back to `CDP_WALLET_TYPE` env var (`"eoa"` or `"smart"`).
   */
  walletConfig?: WalletConfig;
  /**
   * Optional SDK-managed spend controls.
   */
  spendControls?: SpendControls;
  /**
   * Override the public JSON-RPC endpoints used for payment signing, keyed by
   * CAIP-2 network identifier.
   *
   * Falls back to `CDP_X402_RPC_URLS` env var (JSON object mapping CAIP-2 IDs to URL strings).
   */
  rpcUrls?: Partial<Record<string, { rpcUrl: string }>>;
}

/**
 * Result from eagerly creating a CDP x402 client via {@link createCdpX402Client}.
 */
export interface CdpX402ClientResult {
  /** - Configured x402Client with EVM and SVM schemes registered. */
  client: x402Client;
  /** - The underlying CdpClient instance for direct CDP API access. */
  cdpClient: CdpClient;
  /** - The EVM address used for payments. */
  evmAddress: `0x${string}`;
  /** - The Solana account address. */
  svmAddress: string;
  /** - Owner account name. Only set when `walletConfig.type` is `"smart"`. */
  ownerWallet?: string;
}

const DEFAULT_ACCOUNT_NAME = "x402-client-wallet-1";

const resolveWalletType = (type: string | undefined): WalletType => {
  if (!type) return "eoa";
  if (type === "eoa" || type === "smart") return type;
  throw new Error(`Unsupported wallet type "${type}". Supported values: "eoa", "smart".`);
};

const resolveAccountName = (config?: WalletConfig): string =>
  config?.accountName ?? process.env.CDP_ACCOUNT_NAME ?? DEFAULT_ACCOUNT_NAME;

const parseRpcUrlsFromEnv = (): Partial<Record<string, { rpcUrl: string }>> | undefined => {
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
};

const isOwnerAlreadyHasSmartWalletError = (error: unknown): boolean =>
  error instanceof Error && error.message.includes("Multiple smart wallets with the same owner");

const findSmartAccountByOwner = async (
  cdpClient: CdpClient,
  ownerAddress: string,
): Promise<string | undefined> => {
  const normalizedOwner = ownerAddress.toLowerCase();
  let pageToken: string | undefined;
  do {
    const result = await cdpClient.evm.listSmartAccounts({ pageToken });
    const match = result.accounts.find(a => a.owners[0]?.toLowerCase() === normalizedOwner);
    if (match) return match.address;
    pageToken = result.nextPageToken;
  } while (pageToken);
  return undefined;
};

const buildEvmRpcUrlsByChainId = (
  rpcUrlsByCaip2: Record<string, { rpcUrl: string }>,
): Record<number, { rpcUrl: string }> => {
  const result: Record<number, { rpcUrl: string }> = {};
  for (const [caip2, cfg] of Object.entries(rpcUrlsByCaip2)) {
    const [namespace, chainId] = caip2.split(":");
    if (namespace !== "eip155" || !chainId) continue;
    const numericChainId = Number(chainId);
    if (!Number.isNaN(numericChainId)) {
      result[numericChainId] = cfg;
    }
  }
  return result;
};

const buildSvmRpcOverrides = (
  rpcUrlsByCaip2: Record<string, { rpcUrl: string }>,
): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const [caip2, cfg] of Object.entries(rpcUrlsByCaip2)) {
    const [namespace] = caip2.split(":");
    if (namespace === "solana") {
      result[caip2] = cfg.rpcUrl;
    }
  }
  return result;
};

type SignerSetup = {
  cdpClient: CdpClient;
  evmAddress: `0x${string}`;
  svmAddress: string;
  ownerWallet?: string;
};

const setupCdpSigners = async (
  client: x402Client,
  config: CdpX402ClientConfig | undefined,
): Promise<SignerSetup> => {
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

  const cdpClient = new CdpClient({
    apiKeyId: apiKeyId!,
    apiKeySecret: apiKeySecret!,
    walletSecret: walletSecret!,
  });

  const walletConfigInput = config?.walletConfig;
  const walletType = resolveWalletType(walletConfigInput?.type ?? process.env.CDP_WALLET_TYPE);
  const accountName = resolveAccountName(walletConfigInput);

  const svmAccount = await cdpClient.solana.getOrCreateAccount({ name: accountName });

  let evmAddress: `0x${string}`;
  let ownerWallet: string | undefined;
  let evmSigner;

  if (walletType === "smart") {
    const ownerAccountName =
      (walletConfigInput?.type === "smart" ? walletConfigInput.ownerAccountName : undefined) ??
      process.env.CDP_OWNER_ACCOUNT_NAME;

    if (!ownerAccountName) {
      throw new Error(
        'Missing required owner account name for wallet type "smart". ' +
          "Provide it via walletConfig.ownerAccountName or set the CDP_OWNER_ACCOUNT_NAME environment variable.",
      );
    }

    const ownerAccount = await cdpClient.evm.getOrCreateAccount({ name: ownerAccountName });

    let smartAccount;
    try {
      smartAccount = await cdpClient.evm.getOrCreateSmartAccount({
        name: accountName,
        owner: ownerAccount,
      });
    } catch (error) {
      if (isOwnerAlreadyHasSmartWalletError(error)) {
        const existingAddress = await findSmartAccountByOwner(cdpClient, ownerAccount.address);
        if (!existingAddress) throw error;
        smartAccount = await cdpClient.evm.getSmartAccount({
          address: existingAddress as `0x${string}`,
          owner: ownerAccount,
        });
      } else {
        throw error;
      }
    }

    evmAddress = smartAccount.address as `0x${string}`;
    ownerWallet = ownerAccountName;
    evmSigner = fromCdpSmartWallet(smartAccount);
  } else {
    const evmAccount = await cdpClient.evm.getOrCreateAccount({ name: accountName });
    evmAddress = evmAccount.address as `0x${string}`;
    evmSigner = fromCdpEvmAccount(evmAccount);
  }

  const resolvedRpcUrls = { ...parseRpcUrlsFromEnv(), ...config?.rpcUrls };
  const mergedRpcUrls: Record<string, { rpcUrl: string }> = {
    ...CDP_EVM_RPC_URLS,
    ...resolvedRpcUrls,
  } as Record<string, { rpcUrl: string }>;
  const evmRpcUrlsByChainId = buildEvmRpcUrlsByChainId(mergedRpcUrls);
  const svmRpcOverrides = buildSvmRpcOverrides(
    (resolvedRpcUrls ?? {}) as Record<string, { rpcUrl: string }>,
  );
  const svmSigner = cdpSolanaAccountToSvmSigner(svmAccount);

  registerExactEvmScheme(client, { signer: evmSigner, schemeOptions: evmRpcUrlsByChainId });
  registerExactSvmScheme(client, { signer: svmSigner });
  for (const [network, rpcUrl] of Object.entries(svmRpcOverrides)) {
    client.register(network as Network, new ExactSvmScheme(svmSigner, { rpcUrl }));
  }
  if (walletType !== "smart") {
    client.register("eip155:*" as Network, new UptoEvmScheme(evmSigner, evmRpcUrlsByChainId));
  }

  if (config?.spendControls) {
    applySpendControls(client, config.spendControls);
  }

  return { cdpClient, evmAddress, svmAddress: svmAccount.address, ownerWallet };
};

/**
 * A Coinbase CDP-powered x402 client that initializes lazily on first payment.
 *
 * Extends `x402Client` with automatic wallet provisioning and scheme registration.
 * Configuration is read from environment variables by default and can be
 * overridden via explicit config.
 *
 * @example
 * ```typescript
 * import { CdpX402Client } from "@coinbase/cdp-sdk/x402";
 * import { wrapFetchWithPayment } from "@x402/fetch";
 *
 * const client = new CdpX402Client();
 * const fetchWithPayment = wrapFetchWithPayment(fetch, client);
 * const response = await fetchWithPayment("https://api.example.com/report");
 * ```
 *
 * @example
 * ```typescript
 * const USDC_BASE = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
 * const client = new CdpX402Client({
 *   spendControls: {
 *     maxAmountPerPayment: { atomic: 10_000n, asset: USDC_BASE },
 *     maxCumulativeSpend: { atomic: 50_000n, asset: USDC_BASE },
 *     maxCumulativeSpendWindow: "24h",
 *     allowedNetworks: ["eip155:8453"],
 *   },
 * });
 * ```
 */
export class CdpX402Client extends x402Client {
  private readonly _config: CdpX402ClientConfig | undefined;
  private _initPromise: Promise<void> | null = null;

  /**
   * Creates a CdpX402Client that initializes lazily on first payment.
   *
   * @param config - Optional configuration. All fields fall back to environment variables.
   */
  constructor(config?: CdpX402ClientConfig) {
    super();
    this._config = config;
  }

  /**
   * Creates the payment payload, initializing the CDP wallet lazily on first call.
   *
   * @param paymentRequired - The x402 payment requirements from the resource server.
   * @returns The signed payment payload.
   */
  override async createPaymentPayload(paymentRequired: PaymentRequired): Promise<PaymentPayload> {
    await this._ensureInitialized();
    return super.createPaymentPayload(paymentRequired);
  }

  /**
   * Returns a fetch function that automatically handles 402 responses.
   *
   * Delegates to `wrapFetchWithPayment` from `@x402/fetch`. You can also
   * call that directly: `wrapFetchWithPayment(fetch, client)`.
   *
   * @param fetchFn - The fetch implementation to wrap. Defaults to `globalThis.fetch`.
   * @returns A wrapped fetch function that handles 402 responses automatically.
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

  /**
   * Provisions CDP accounts and registers payment schemes.
   */
  private async _initialize(): Promise<void> {
    await setupCdpSigners(this, this._config);
  }

  /**
   * Returns a shared initialization promise, starting initialization if needed.
   *
   * @returns Promise that resolves when the client is ready to make payments.
   */
  private _ensureInitialized(): Promise<void> {
    if (!this._initPromise) {
      this._initPromise = this._initialize().catch(error => {
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
 * Use this when you need the wallet address(es) before making any payments.
 * For most use cases, prefer `CdpX402Client` which defers initialization.
 *
 * @param config - Optional configuration. All fields fall back to env vars.
 * @returns A configured client plus resolved wallet addresses.
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
  return { client, cdpClient, evmAddress, svmAddress, ownerWallet };
}
