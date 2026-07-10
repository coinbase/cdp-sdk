/*
 * CDP-powered x402 payment client.
 *
 * CdpX402Client is a drop-in extension of x402Client that auto-provisions
 * CDP-managed wallets (EVM EOA or Smart Contract Wallet + Solana), registers
 * payment schemes and wires spend controls.
 * Credentials and RPC URLs fall back to environment variables; wallet
 * configuration is supplied explicitly via config.
 */
import { x402Client } from "@x402/core/client";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { UptoEvmScheme } from "@x402/evm/upto/client";
import { ExactSvmScheme, registerExactSvmScheme } from "@x402/svm/exact/client";

import {
  cdpSolanaAccountToSvmSigner,
  fromCdpEvmAccount,
  fromCdpSmartWallet,
} from "./account-signers.js";
import { getDefaultEvmRpcUrls } from "./constants.js";
import { CdpClient } from "../client/cdp.js";
import { applySpendControls } from "./guardrails/apply.js";
import { findSmartAccountByOwner, isOwnerAlreadyHasSmartWalletError } from "./smart-account.js";

import type { SpendControls } from "./guardrails/types.js";
import type { Network, PaymentPayload, PaymentRequired } from "@x402/core/types";
import type { Address } from "viem";

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
       * Named CDP account. Defaults to `"x402-client-wallet-1"`.
       */
      accountName?: string;
    }
  | {
      /** CDP Smart Contract Wallet. */
      type: "smart";
      /**
       * Named CDP smart account. Defaults to `"x402-client-wallet-1"`.
       */
      accountName?: string;
      /**
       * Owner EOA account name. Required for `"smart"` type.
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
   */
  walletConfig?: WalletConfig;
  /**
   * Optional SDK-managed spend controls.
   */
  spendControls?: SpendControls;
  /**
   * JSON-RPC endpoints used for payment signing, keyed by CAIP-2 network
   * identifier.
   *
   * Base and Base Sepolia already resolve an RPC automatically via the
   * CDP-authenticated node endpoint, so no override is required for those.
   * Every other network (Polygon, Arbitrum, World, etc.) has no default and
   * must be supplied here to backfill optional EVM extension capabilities
   * (for example, `eip2612` gas-sponsoring enrichment).
   *
   * Falls back to `CDP_X402_RPC_URLS` env var (JSON object mapping CAIP-2 IDs to URL strings).
   */
  rpcUrls?: Partial<Record<string, { rpcUrl: string }>>;
}

const DEFAULT_ACCOUNT_NAME = "x402-client-wallet-1";

const resolveWalletType = (type: string | undefined): WalletType => {
  if (!type) return "eoa";
  if (type === "eoa" || type === "smart") return type;
  throw new Error(`Unsupported wallet type "${type}". Supported values: "eoa", "smart".`);
};

const resolveAccountName = (config?: WalletConfig): string =>
  config?.accountName ?? DEFAULT_ACCOUNT_NAME;

const parseRpcUrlsFromEnv = (): Partial<Record<string, { rpcUrl: string }>> | undefined => {
  const raw = process.env.CDP_X402_RPC_URLS;
  if (!raw) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      "CDP_X402_RPC_URLS must be valid JSON, e.g. " +
        '\'{"eip155:137":"https://your-rpc-provider.example.com/polygon"}\'',
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
  evmAddress: Address;
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
  const walletType = resolveWalletType(walletConfigInput?.type);
  const accountName = resolveAccountName(walletConfigInput);

  const svmAccount = await cdpClient.solana.getOrCreateAccount({ name: accountName });

  let evmAddress: Address;
  let ownerWallet: string | undefined;
  let evmSigner;

  if (walletType === "smart") {
    const ownerAccountName =
      walletConfigInput?.type === "smart" ? walletConfigInput.ownerAccountName : undefined;

    if (!ownerAccountName) {
      throw new Error(
        'Missing required owner account name for wallet type "smart". ' +
          "Provide it via walletConfig.ownerAccountName.",
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
          address: existingAddress as Address,
          owner: ownerAccount,
        });
      } else {
        throw error;
      }
    }

    evmAddress = smartAccount.address as Address;
    ownerWallet = ownerAccountName;
    evmSigner = fromCdpSmartWallet(smartAccount);
  } else {
    const evmAccount = await cdpClient.evm.getOrCreateAccount({ name: accountName });
    evmAddress = evmAccount.address as Address;
    evmSigner = fromCdpEvmAccount(evmAccount);
  }

  const resolvedRpcUrls = { ...parseRpcUrlsFromEnv(), ...config?.rpcUrls };
  const mergedRpcUrls: Record<string, { rpcUrl: string }> = {
    ...(await getDefaultEvmRpcUrls()),
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
  /*
   * `upto` is registered only for EOA wallets. Smart accounts sign with an
   * ERC-1271/ERC-6492 contract signature, which only settles via the EIP-3009
   * `exact` flow; `upto`'s Permit2 transfer method requires an on-chain Permit2
   * allowance owned by an EOA, so it's intentionally unsupported for smart accounts.
   */
  if (walletType !== "smart") {
    client.register("eip155:*" as Network, new UptoEvmScheme(evmSigner, evmRpcUrlsByChainId));
  }

  if (config?.spendControls) {
    applySpendControls(client, config.spendControls);
  }

  return { cdpClient, evmAddress, svmAddress: svmAccount.address, ownerWallet };
};

/**
 * Wallet addresses provisioned by a {@link CdpX402Client}.
 */
export interface CdpX402WalletAddresses {
  /** EVM address (EOA or Smart Contract Wallet) used for payment signing. */
  evmAddress: Address;
  /** Solana address used for payment signing. */
  svmAddress: string;
  /** Name of the owner EOA account backing a `"smart"` wallet, if configured. */
  ownerWallet?: string;
}

/**
 * A Coinbase CDP-powered x402 client that initializes lazily on first payment.
 *
 * Extends `x402Client` with automatic wallet provisioning and scheme registration.
 * Credentials and RPC URLs fall back to environment variables; wallet
 * configuration is supplied explicitly via config.
 *
 * The account name/address used for payments is resolved internally. Use
 * {@link CdpX402Client.getAddresses} to retrieve it — for example, to fund
 * the wallet before making a payment.
 *
 * @example
 * ```typescript
 * import { CdpX402Client } from "@coinbase/cdp-sdk/x402";
 * import { wrapFetchWithPayment } from "@x402/fetch";
 *
 * const client = new CdpX402Client();
 * const { evmAddress, svmAddress } = await client.getAddresses();
 * console.log("Fund this address before paying:", evmAddress, svmAddress);
 *
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
  private _addresses: CdpX402WalletAddresses | null = null;

  /**
   * Creates a CdpX402Client that initializes lazily on first payment.
   *
   * @param config - Optional configuration. Credentials and RPC URLs fall back to environment variables.
   */
  constructor(config?: CdpX402ClientConfig) {
    super();
    this._config = config;
  }

  /**
   * The CDP account name that this client provisions (or has already
   * provisioned) for payment signing. Resolved synchronously from config
   * and defaults — does not perform any CDP account lookups.
   *
   * @returns The resolved account name, e.g. `"x402-client-wallet-1"`.
   */
  get accountName(): string {
    return resolveAccountName(this._config?.walletConfig);
  }

  /**
   * Provisions the CDP wallet (if not already provisioned) and returns its
   * addresses. Call this eagerly — for example, to display or fund the
   * wallet — instead of waiting for the lazy initialization on first payment.
   *
   * @returns The EVM and Solana addresses backing this client's payments.
   */
  async getAddresses(): Promise<CdpX402WalletAddresses> {
    await this._ensureInitialized();
    return this._addresses!;
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
   * Provisions CDP accounts and registers payment schemes.
   */
  private async _initialize(): Promise<void> {
    const { evmAddress, svmAddress, ownerWallet } = await setupCdpSigners(this, this._config);
    this._addresses = { evmAddress, svmAddress, ownerWallet };
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
