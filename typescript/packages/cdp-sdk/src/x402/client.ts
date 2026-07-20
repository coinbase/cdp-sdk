/*
 * CDP-powered x402 payment client.
 *
 * CdpX402Client is a drop-in extension of x402Client that auto-provisions
 * CDP-managed wallets (EVM EOA or Smart Contract Wallet + Solana), registers
 * payment schemes and wires spend controls.
 * Credentials fall back to environment variables; wallet configuration and
 * RPC URLs are supplied explicitly via config.
 */
import { x402Client } from "@x402/core/client";
import { BatchSettlementEvmScheme } from "@x402/evm/batch-settlement/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { ExactEvmSchemeV1 } from "@x402/evm/exact/v1/client";
import { UptoEvmScheme } from "@x402/evm/upto/client";
import { ExactSvmScheme } from "@x402/svm/exact/client";
import { ExactSvmSchemeV1 } from "@x402/svm/exact/v1/client";

import {
  cdpSolanaAccountToSvmSigner,
  fromCdpEvmAccount,
  fromCdpSmartWallet,
} from "./account-signers.js";
import { baseMainnetCaip2, baseSepoliaCaip2, getDefaultEvmRpcUrls } from "./constants.js";
import { CdpClient } from "../client/cdp.js";
import { applySpendControls } from "./guardrails/apply.js";
import { normalizeNetwork } from "./guardrails/normalize.js";
import { findSmartAccountByOwner, isOwnerAlreadyHasSmartWalletError } from "./smart-account.js";

import type { SpendControls } from "./guardrails/types.js";
import type { Network, PaymentPayload, PaymentRequired } from "@x402/core/types";
import type { Address } from "viem";

/** Wallet type for CDP Server Wallet (EOA) or Smart Contract Wallet. */
type WalletType = "eoa" | "smart";

type SupportedNetwork =
  | "base"
  | "base-sepolia"
  | "polygon"
  | "arbitrum"
  | "world"
  | "world-sepolia"
  | "solana"
  | "solana-devnet";

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

export type SchemesConfig = {
  exact?: boolean;
  upto?: boolean;
  batchSettlement?: boolean;
};

export type NetworkConfig = {
  network: SupportedNetwork;
  rpcUrl?: string;
  scheme: SchemesConfig;
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
   * Deployment environment. Controls which Base network is prescribed by default.
   *
   * - `"production"` (default) — Base mainnet.
   * - `"development"` — Base Sepolia.
   *
   * Falls back to the `CDP_X402_CLIENT_ENVIRONMENT` env var.
   */
  environment?: "production" | "development";

  /**
   * Optional SDK-managed additional network schemes configuration.
   *
   * The Base network matching `environment` is always prescribed as a
   * baseline, regardless of this option, since CDP hosts a default RPC for it:
   *
   * Defaults to [
   *    { network: "base", scheme: { exact: true, upto: true } },
   * ]
   * (or `"base-sepolia"` instead of `"base"` when `environment` is `"development"`)
   *
   * Use `networkSchemes` to add other networks (e.g. `"solana"`, `"polygon"`,
   * or the Base network for the *other* environment), or to override the
   * scheme for the prescribed Base network (e.g. to disable a scheme). An
   * override for `"base"` or `"base-sepolia"` that omits `rpcUrl` still gets
   * the CDP-hosted default RPC injected for it.
   *
   * Solana has no CDP-hosted default RPC and no override is required for
   * `exact` — it falls back to a public default RPC. `upto` and
   * `batchSettlement` aren't yet supported for Solana (skipped with a
   * warning), regardless of `rpcUrl`.
   */
  networkSchemes?: NetworkConfig[];
}

const DEFAULT_ACCOUNT_NAME = "x402-client-wallet-1";

const resolveWalletType = (type: string | undefined): WalletType => {
  if (!type) return "eoa";
  if (type === "eoa" || type === "smart") return type;
  throw new Error(`Unsupported wallet type "${type}". Supported values: "eoa", "smart".`);
};

const resolveAccountName = (config?: WalletConfig): string =>
  config?.accountName ?? DEFAULT_ACCOUNT_NAME;

/**
 * Resolves the deployment environment, falling back from explicit config to
 * the `CDP_X402_CLIENT_ENVIRONMENT` env var. Mirrors the server-side
 * `CDP_X402_SERVER_ENVIRONMENT` resolution in `server.ts`.
 *
 * @param config - Optional explicit environment override.
 * @returns `"development"` only when explicitly requested; `"production"` otherwise.
 */
const resolveEnvironment = (
  config: Pick<CdpX402ClientConfig, "environment"> | undefined,
): "production" | "development" => {
  const rawEnv =
    config?.environment ??
    (process.env.CDP_X402_CLIENT_ENVIRONMENT as "production" | "development" | undefined);
  return rawEnv === "development" ? "development" : "production";
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

  const svmSigner = cdpSolanaAccountToSvmSigner(svmAccount);

  // Keyed by CAIP-2 identifier (e.g. "eip155:8453"), not by network name.
  const defaultEvmRpcUrls = await getDefaultEvmRpcUrls();
  const defaultBaseRpcUrl = defaultEvmRpcUrls[baseMainnetCaip2]?.rpcUrl;
  const defaultBaseSepoliaRpcUrl = defaultEvmRpcUrls[baseSepoliaCaip2]?.rpcUrl;

  // `environment` "development" prescribes Base Sepolia; "production" (default) prescribes Base mainnet.
  const environment = resolveEnvironment(config);
  const defaultNetworkSchemes: NetworkConfig[] =
    environment === "development"
      ? [
          {
            network: "base-sepolia",
            rpcUrl: defaultBaseSepoliaRpcUrl,
            scheme: { exact: true, upto: true },
          },
        ]
      : [
          {
            network: "base",
            rpcUrl: defaultBaseRpcUrl,
            scheme: { exact: true, upto: true },
          },
        ];

  // `networkSchemes` is additive on top of the default baseline: it overrides the prescribed network's scheme, or adds a new one.
  const networksByName = new Map(defaultNetworkSchemes.map(config => [config.network, config]));
  for (const override of config?.networkSchemes ?? []) {
    const rpcUrl = override.rpcUrl ?? networksByName.get(override.network)?.rpcUrl;
    networksByName.set(override.network, { ...override, rpcUrl });
  }

  // `normalizeNetwork` converts the v1-style plain names used here (e.g. "base") into the CAIP-2 form v2's `register` needs (e.g. "eip155:8453"); `registerV1` keeps using the plain name.
  const evmRpcUrlsByCaip2: Record<string, { rpcUrl: string }> = {};
  for (const [network, netConfig] of networksByName) {
    if (network === "solana" || network === "solana-devnet") continue;
    if (netConfig.rpcUrl)
      evmRpcUrlsByCaip2[normalizeNetwork(network)] = { rpcUrl: netConfig.rpcUrl };
  }
  const evmRpcUrlsByChainId = buildEvmRpcUrlsByChainId(evmRpcUrlsByCaip2);

  for (const [network, netConfig] of networksByName) {
    const caip2Network = normalizeNetwork(network) as Network;
    const isSolana = network === "solana" || network === "solana-devnet";

    if (netConfig.scheme.exact) {
      if (isSolana) {
        client.register(caip2Network, new ExactSvmScheme(svmSigner, { rpcUrl: netConfig.rpcUrl }));
        client.registerV1(
          network as Network,
          new ExactSvmSchemeV1(svmSigner, { rpcUrl: netConfig.rpcUrl }),
        );
      } else {
        client.register(caip2Network, new ExactEvmScheme(evmSigner, evmRpcUrlsByChainId));
        client.registerV1(network as Network, new ExactEvmSchemeV1(evmSigner));
      }
    }

    // `upto`'s Permit2 transfer method requires an initial approval transaction that cannot be sponsored; disabled for smart accounts at this time.
    if (netConfig.scheme.upto && walletType !== "smart") {
      if (isSolana) {
        // eslint-disable-next-line no-console
        console.warn(
          `CdpX402Client: skipping network "${network}": Solana Upto scheme is not yet supported.`,
        );
      } else {
        client.register(caip2Network, new UptoEvmScheme(evmSigner, evmRpcUrlsByChainId));
      }
    }

    if (netConfig.scheme.batchSettlement) {
      if (isSolana) {
        // eslint-disable-next-line no-console
        console.warn(
          `CdpX402Client: skipping network "${network}": Solana Batch Settlement scheme is not yet supported.`,
        );
      } else {
        client.register(
          caip2Network,
          new BatchSettlementEvmScheme(evmSigner, { rpcUrl: netConfig.rpcUrl }),
        );
      }
    }
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
 * Credentials fall back to environment variables; wallet configuration and
 * RPC URLs are supplied explicitly via config.
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
   * @param config - Optional configuration. Credentials fall back to environment variables.
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
