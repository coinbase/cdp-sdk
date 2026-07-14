/**
 * CDP-powered x402 resource server.
 *
 * `createX402Server()` is the primary entry point. It accepts a route
 * configuration (and optional receiver wallet config), provisions EVM and
 * Solana receiver wallets automatically, and returns a fully initialized
 * `X402Server`.
 *
 * `X402Server` **extends** `x402HTTPResourceServer` — it is a drop-in
 * replacement and can be passed anywhere an `x402HTTPResourceServer` is
 * expected (e.g. `paymentMiddlewareFromHTTPServer`, Hono / Next.js adapters).
 *
 * Routes may be supplied in either format:
 *
 * **Simplified CDP format** (`CdpRouteConfig`) — just `price` and optional
 * `description` / `networks`. The server fills in `scheme`, `payTo`, and
 * all x402 internals automatically.
 *
 * **Full x402 format** (`RouteConfig`) — the same `accepts` / `description`
 * shape accepted by `x402HTTPResourceServer`. Vacant `payTo` fields (`""`)
 * are filled with the provisioned receiver address for that network family.
 *
 * Both formats can be mixed within the same `routes` map.
 *
 * The `payToConfig` field controls how the receiver wallet address is resolved:
 * - `{ type: "eoa" }` (default) — provisions a CDP EVM EOA + Solana account
 * - `{ type: "smart", ownerAccountName }` — provisions a CDP Smart Contract Wallet
 * - `{ type: "address", evm, solana }` — uses provided addresses directly, no provisioning
 *
 * @example Minimal CDP Dev setup:
 * ```typescript
 * import { createX402Server } from "@coinbase/cdp-sdk/x402";
 * import { paymentMiddlewareFromHTTPServer } from "@x402/express";
 *
 * // Set: CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET
 * const server = await createX402Server({
 *   routes: {
 *     "GET /report": { price: "$0.01", description: "AI-generated report" },
 *   },
 * });
 * app.use(paymentMiddlewareFromHTTPServer(server));
 * console.log("EVM receiver:", server.payToEvmAddress);
 * ```
 *
 * @example Bring your own addresses (skip wallet provisioning):
 * ```typescript
 * const server = await createX402Server({
 *   routes: { "GET /report": { price: "$0.01" } },
 *   payToConfig: { type: "address", evm: "0x...", solana: "..." },
 * });
 * ```
 *
 * @example Full x402 format (interop with x402HTTPResourceServer):
 * ```typescript
 * const server = await createX402Server({
 *   routes: {
 *     "GET /report": {
 *       accepts: [
 *         { scheme: "exact", price: "$0.01", network: "eip155:8453", payTo: "" },
 *         { scheme: "exact", price: "$0.01", network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", payTo: "" },
 *       ],
 *     },
 *   },
 * });
 * ```
 */

import { readFile } from "node:fs/promises";

import { x402ResourceServer, x402HTTPResourceServer } from "@x402/core/server";

import {
  baseMainnetCaip2,
  baseSepoliaCaip2,
  solanaMainnetCaip2,
  solanaDevnetCaip2,
} from "./constants.js";
import { createCdpFacilitatorClient } from "./facilitator.js";
import {
  getCdpDefaultSchemes,
  getCdpBatchSettlementScheme,
  getCdpExtensionRegistrations,
  CDP_SUPPORTED_EXTENSIONS,
  CDP_EXTENSION_BAZAAR,
  buildBazaarDeclaration,
} from "./server-extensions.js";
import { findSmartAccountByOwner, isOwnerAlreadyHasSmartWalletError } from "./smart-account.js";
import { CdpClient } from "../client/cdp.js";

import type { RoutesConfig, RouteConfig } from "@x402/core/server";
import type { Network } from "@x402/core/types";
import type { Address } from "viem";

/*
 * ---------------------------------------------------------------------------
 * Default networks
 * ---------------------------------------------------------------------------
 */

const DEFAULT_SERVER_ACCOUNT_NAME = "x402-receiver-wallet-1";

/**
 * Default EVM networks (production) — Base mainnet (`eip155:8453`).
 */
export const CDP_SERVER_DEFAULT_EVM_NETWORKS = [baseMainnetCaip2] as const;

/**
 * Default Solana networks (production) — Solana mainnet.
 */
export const CDP_SERVER_DEFAULT_SVM_NETWORKS = [solanaMainnetCaip2] as const;

/**
 * Default networks for production: Base mainnet + Solana mainnet.
 */
export const CDP_SERVER_DEFAULT_NETWORKS: readonly string[] = [
  ...CDP_SERVER_DEFAULT_EVM_NETWORKS,
  ...CDP_SERVER_DEFAULT_SVM_NETWORKS,
];

/**
 * Default EVM networks for development — Base Sepolia (`eip155:84532`).
 */
export const CDP_SERVER_DEVELOPMENT_EVM_NETWORKS = [baseSepoliaCaip2] as const;

/**
 * Default Solana networks for development — Solana Devnet.
 */
export const CDP_SERVER_DEVELOPMENT_SVM_NETWORKS = [solanaDevnetCaip2] as const;

/**
 * Default networks for development: Base Sepolia + Solana Devnet.
 */
export const CDP_SERVER_DEVELOPMENT_NETWORKS: readonly string[] = [
  ...CDP_SERVER_DEVELOPMENT_EVM_NETWORKS,
  ...CDP_SERVER_DEVELOPMENT_SVM_NETWORKS,
];

/*
 * ---------------------------------------------------------------------------
 * Types
 * ---------------------------------------------------------------------------
 */

/**
 * Payment scheme identifiers supported by the simplified CDP route format.
 *
 * - `"exact"` — (default) Transfer a fixed amount, locked at signing time.
 *   Supports EVM and Solana networks.
 * - `"upto"` — Usage-based billing: the client authorizes a maximum amount
 *   and the server settles the actual amount charged (≤ max) via Permit2.
 *   EVM-only (`eip155:*`).
 * - `"batch-settlement"` — High-throughput stateful payment channels. Clients
 *   deposit once and sign off-chain vouchers per request. EVM-only (`eip155:*`).
 */
export type CdpPaymentScheme = "exact" | "upto" | "batch-settlement";

/**
 * Simplified CDP-owned route configuration.
 *
 * Specifying just `price` (and optionally `description` / `networks`) is
 * enough for most routes. `createX402Server` automatically expands this
 * into the full x402 `RouteConfig` format with `scheme`, `payTo`, and
 * `maxTimeoutSeconds` filled in.
 *
 * For routes that need fine-grained control (custom scheme, explicit `payTo`,
 * etc.) pass a full x402 `RouteConfig` instead — both formats are accepted
 * in the same `routes` map.
 */
export interface CdpRouteConfig {
  /**
   * Payment amount required to access this route, e.g. `"$0.01"`.
   * Accepts any amount string supported by the x402 protocol.
   */
  price: string;
  /** Human-readable description of what this route provides. */
  description?: string;
  /**
   * Payment scheme to use for this route.
   *
   * Defaults to `"exact"`. The `"upto"` and `"batch-settlement"` schemes are
   * EVM-only — `networks` must not include Solana or other non-EVM chains when
   * they are specified. When an EVM-only scheme is used without an explicit
   * `networks` list the default falls back to the environment's EVM networks
   * (Base mainnet or Base Sepolia depending on `environment`).
   */
  scheme?: CdpPaymentScheme;
  /**
   * CAIP-2 network identifiers for which the route accepts payments.
   * Defaults to `CDP_SERVER_DEFAULT_NETWORKS` (Base mainnet + Solana mainnet)
   * for the `"exact"` scheme, or `CDP_SERVER_DEFAULT_EVM_NETWORKS` (Base
   * mainnet only) for `"upto"`.
   */
  networks?: string[];
  /**
   * Maximum seconds a payment token is valid before expiry.
   * Defaults to `300` (5 minutes).
   */
  maxTimeoutSeconds?: number;
  /**
   * Extension overrides for this route.
   *
   * All three CDP extensions (`eip2612GasSponsoring`, `erc20ApprovalGasSponsoring`,
   * and `bazaar`) are injected automatically. Use this field to override the
   * auto-generated Bazaar declaration with richer discovery metadata.
   */
  extensions?: Record<string, unknown>;
}

/**
 * Receiver wallet configuration for `createX402Server`.
 *
 * Controls how receiver wallet addresses are resolved:
 * - `"eoa"` — provision a CDP EVM EOA + Solana account (default)
 * - `"smart"` — provision a CDP Smart Contract Wallet + Solana account
 * - `"address"` — use provided addresses directly, no provisioning needed
 */
export type PayToConfig =
  | {
      /** CDP Server Wallet (EOA). Default when `type` is omitted. */
      type: "eoa";
      /**
       * Named CDP account to use as the receiver wallet.
       * Defaults to `"x402-receiver-wallet-1"`.
       */
      accountName?: string;
    }
  | {
      /** CDP Smart Contract Wallet. */
      type: "smart";
      /**
       * Named CDP smart account. Defaults to `"x402-receiver-wallet-1"`.
       */
      accountName?: string;
      /**
       * Owner EOA account name. Required for `"smart"` type.
       */
      ownerAccountName: string;
    }
  | {
      /**
       * Use provided addresses directly.
       * No wallet provisioning is performed — `CDP_WALLET_SECRET` is not required.
       * API key credentials (`CDP_API_KEY_ID` / `CDP_API_KEY_SECRET`) are still
       * needed for the CDP facilitator.
       * At least one of `evm` or `solana` should be provided, or all routes
       * must supply explicit `payTo` values in the full x402 `RouteConfig` format.
       */
      type: "address";
      /** EVM address to receive payments. */
      evm?: Address;
      /** Solana address to receive payments. */
      solana?: string;
    };

/**
 * Configuration for `createX402Server()`.
 *
 * All credential fields fall back to environment variables, so an empty
 * object `{}` with a `routes` map is sufficient in most environments.
 *
 * Pass `configPath` to load routes (and optionally credentials) from a JSON
 * file instead of specifying them inline.
 */
export interface CdpX402ServerConfig {
  /**
   * CDP API key ID.
   * Falls back to `CDP_API_KEY_ID` env var.
   */
  apiKeyId?: string;
  /**
   * CDP API key secret.
   * Falls back to `CDP_API_KEY_SECRET` env var.
   */
  apiKeySecret?: string;
  /**
   * CDP wallet secret used to provision the receiver wallet.
   * Falls back to `CDP_WALLET_SECRET` env var.
   * Not required when `payToConfig.type` is `"address"`.
   */
  walletSecret?: string;
  /**
   * Deployment environment. Controls which networks are used by default.
   *
   * - `"production"` (default) — Base mainnet + Solana mainnet.
   * - `"development"` — Base Sepolia + Solana Devnet.
   *
   * Falls back to `CDP_X402_SERVER_ENVIRONMENT` env var.
   */
  environment?: "production" | "development";
  /**
   * Receiver wallet / payTo configuration.
   *
   * Defaults to `{ type: "eoa" }` which provisions a CDP Server Wallet (EOA)
   * named `"x402-receiver-wallet-1"`.
   *
   * Use `{ type: "address", evm: "0x...", solana: "..." }` to provide your
   * own addresses without provisioning a CDP wallet.
   */
  payToConfig?: PayToConfig;
  /**
   * Payment-protected routes served by this server.
   *
   * Map of HTTP method + path pattern → route config.
   * Keys use the `"METHOD /path"` convention, e.g. `"GET /report"`.
   *
   * Each value is either:
   * - A `CdpRouteConfig` — simplified format, just `price` + optional fields.
   * - A `RouteConfig` — full x402 format with an `accepts` array/object.
   *
   * Both formats can be mixed within the same map.
   * May be omitted when `configPath` supplies the routes.
   */
  routes?: Record<string, CdpRouteConfig | RouteConfig>;
  /**
   * Path to a JSON file whose fields are merged with this inline config.
   * Inline config takes precedence over file config when both specify the
   * same field. The file mirrors {@link CdpX402ServerConfig} (minus `configPath`).
   *
   * @example
   * ```json
   * {
   *   "routes": {
   *     "GET /report": { "price": "$0.01", "description": "AI-generated report" }
   *   }
   * }
   * ```
   *
   * A full JSON Schema for the file lives at
   * `examples/typescript/x402/servers/express/x402.config.schema.json`.
   *
   * Security: this file may carry credentials (`apiKeySecret` / `walletSecret`).
   * Prefer environment variables for credentials and use the file for `routes`;
   * if secrets are stored here, keep the file out of version control.
   */
  configPath?: string;
}

/*
 * ---------------------------------------------------------------------------
 * Internal wallet provisioning
 * ---------------------------------------------------------------------------
 */

interface ProvisionedAddresses {
  evmAddress: Address | "";
  svmAddress: string;
  ownerWallet?: string;
}

/** Network families referenced by a route set, controlling which wallets to provision. */
interface NetworkFamilies {
  evm: boolean;
  svm: boolean;
}

/**
 * Resolves server-scoped CDP credentials and environment, falling back from
 * explicit config to `CDP_*` env vars
 *
 * @param config - Optional explicit credential overrides.
 * @returns Resolved credential strings and environment (any credential may be `undefined` if not found).
 */
function resolveServerCredentials(
  config: Pick<CdpX402ServerConfig, "apiKeyId" | "apiKeySecret" | "walletSecret" | "environment">,
): {
  apiKeyId: string | undefined;
  apiKeySecret: string | undefined;
  walletSecret: string | undefined;
  environment: "production" | "development";
} {
  const rawEnv =
    config.environment ??
    (process.env.CDP_X402_SERVER_ENVIRONMENT as "production" | "development" | undefined);
  const environment: "production" | "development" =
    rawEnv === "development" ? "development" : "production";

  return {
    apiKeyId: config.apiKeyId ?? process.env.CDP_API_KEY_ID,
    apiKeySecret: config.apiKeySecret ?? process.env.CDP_API_KEY_SECRET,
    walletSecret: config.walletSecret ?? process.env.CDP_WALLET_SECRET,
    environment,
  };
}

/**
 * Provisions CDP EVM and Solana receiver accounts for use as `payTo` addresses.
 *
 * @param credentials - CDP API credentials for wallet operations.
 * @param credentials.apiKeyId - CDP API key ID.
 * @param credentials.apiKeySecret - CDP API key secret.
 * @param credentials.walletSecret - CDP wallet secret for signing.
 * @param payToConfig - Resolved wallet type (`"eoa"` or `"smart"`) and account names.
 * @param need - Which network families the routes actually reference. Only the
 *   referenced families are provisioned, so an EVM-only server never creates a
 *   Solana account (and vice versa).
 * @returns Provisioned EVM address, Solana address, and optional owner wallet name.
 */
async function provisionServerAccounts(
  credentials: { apiKeyId: string; apiKeySecret: string; walletSecret: string },
  payToConfig: Exclude<PayToConfig, { type: "address" }>,
  need: NetworkFamilies,
): Promise<ProvisionedAddresses> {
  const cdpClient = new CdpClient({
    apiKeyId: credentials.apiKeyId,
    apiKeySecret: credentials.apiKeySecret,
    walletSecret: credentials.walletSecret,
  });

  const accountName = payToConfig.accountName ?? DEFAULT_SERVER_ACCOUNT_NAME;

  const svmAddress = need.svm
    ? (await cdpClient.solana.getOrCreateAccount({ name: accountName })).address
    : "";

  if (!need.evm) {
    return { evmAddress: "", svmAddress };
  }

  if (payToConfig.type === "smart") {
    const ownerAccount = await cdpClient.evm.getOrCreateAccount({
      name: payToConfig.ownerAccountName,
    });

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

    return {
      evmAddress: smartAccount.address as Address,
      svmAddress,
      ownerWallet: payToConfig.ownerAccountName,
    };
  }

  const evmAccount = await cdpClient.evm.getOrCreateAccount({ name: accountName });
  return {
    evmAddress: evmAccount.address as Address,
    svmAddress,
  };
}

/*
 * ---------------------------------------------------------------------------
 * Route resolution helpers
 * ---------------------------------------------------------------------------
 */

/**
 * Returns `true` when the given payment scheme only supports EVM networks.
 *
 * @param scheme - The payment scheme to check.
 * @returns `true` for EVM-only schemes (`"upto"` and `"batch-settlement"`).
 */
function isEvmOnlyScheme(scheme: CdpPaymentScheme): boolean {
  return scheme === "upto" || scheme === "batch-settlement";
}

/**
 * Classifies a CAIP-2 network identifier into a receiver-wallet family.
 *
 * @param network - CAIP-2 network identifier, e.g. `"eip155:8453"`.
 * @returns `"evm"` for `eip155:*`, `"svm"` for `solana:*`, otherwise `"other"`.
 */
function networkFamily(network: string): "evm" | "svm" | "other" {
  if (network.startsWith("eip155:")) return "evm";
  if (network.startsWith("solana:")) return "svm";
  return "other";
}

/**
 * Returns the default networks for a simplified route given its scheme and the
 * deployment environment. EVM-only schemes (`"upto"`, `"batch-settlement"`)
 * default to EVM networks only.
 *
 * @param scheme - Payment scheme for the route.
 * @param environment - Deployment environment controlling mainnet vs testnet defaults.
 * @returns The default CAIP-2 networks for the scheme.
 */
function getDefaultNetworksForScheme(
  scheme: CdpPaymentScheme,
  environment: "production" | "development",
): readonly string[] {
  if (isEvmOnlyScheme(scheme)) {
    return environment === "development"
      ? CDP_SERVER_DEVELOPMENT_EVM_NETWORKS
      : CDP_SERVER_DEFAULT_EVM_NETWORKS;
  }
  return environment === "development"
    ? CDP_SERVER_DEVELOPMENT_NETWORKS
    : CDP_SERVER_DEFAULT_NETWORKS;
}

/**
 * Determines which network families (EVM / Solana) a single route references,
 * resolving simplified routes against their scheme defaults so the answer
 * reflects the networks that will actually be served.
 *
 * @param route - Simplified CDP route config or full x402 `RouteConfig`.
 * @param environment - Deployment environment controlling default network selection.
 * @returns The network families referenced by the route.
 */
function routeNetworkFamilies(
  route: CdpRouteConfig | RouteConfig,
  environment: "production" | "development",
): NetworkFamilies {
  const networks: string[] = [];
  if ("accepts" in route) {
    const accepts = Array.isArray(route.accepts) ? route.accepts : [route.accepts];
    for (const option of accepts) networks.push(option.network as string);
  } else {
    const scheme = route.scheme ?? "exact";
    networks.push(...(route.networks ?? getDefaultNetworksForScheme(scheme, environment)));
  }
  return {
    evm: networks.some(network => networkFamily(network) === "evm"),
    svm: networks.some(network => networkFamily(network) === "svm"),
  };
}

/**
 * Aggregates the network families referenced across all routes. Used to decide
 * which receiver wallets to provision so an EVM-only server never creates a
 * Solana account (and vice versa).
 *
 * @param routes - Map of route patterns to simplified or full x402 route configs.
 * @param environment - Deployment environment controlling default network selection.
 * @returns The union of network families referenced by the route set.
 */
function requiredNetworkFamilies(
  routes: Record<string, CdpRouteConfig | RouteConfig>,
  environment: "production" | "development",
): NetworkFamilies {
  const result: NetworkFamilies = { evm: false, svm: false };
  for (const route of Object.values(routes)) {
    const families = routeNetworkFamilies(route, environment);
    result.evm ||= families.evm;
    result.svm ||= families.svm;
  }
  return result;
}

/**
 * Throws when a scheme is configured with an unsupported network family.
 *
 * @param scheme - Payment scheme name (e.g. `"upto"`).
 * @param network - CAIP-2 network identifier (e.g. `"eip155:8453"`).
 */
function assertSchemeSupportsNetwork(scheme: string, network: string): void {
  if (isEvmOnlyScheme(scheme as CdpPaymentScheme) && !network.startsWith("eip155:")) {
    throw new Error(
      `Scheme "${scheme}" only supports EVM (eip155:*) networks. ` +
        `Network "${network}" is not supported. ` +
        `Remove it from the networks list or use scheme "exact".`,
    );
  }
}

/**
 * Throws when the resolved `payTo` address for a network is empty. This can
 * happen when `payToConfig: { type: "address" }` is used without providing
 * an address for the given network family.
 *
 * @param payTo - The resolved address (may be empty string).
 * @param network - The CAIP-2 network identifier for the route option.
 */
function assertNonEmptyPayTo(payTo: string, network: string): void {
  if (payTo === "") {
    const family = network.startsWith("eip155:")
      ? "EVM (`evm`)"
      : network.startsWith("solana:")
        ? "Solana (`solana`)"
        : `"${network}"`;
    throw new Error(
      `No receiver address for ${family} network "${network}". ` +
        `Provide a receiver address via payToConfig (e.g. { type: "address", evm: "0x...", solana: "..." }) ` +
        `or use payToConfig: { type: "eoa" } to auto-provision a CDP wallet.`,
    );
  }
}

/**
 * Fills vacant `payTo` fields (`""`) in a full x402 `RouteConfig` with the
 * provisioned receiver addresses for each network family. Returns a new object —
 * the original is not mutated. Non-vacant `payTo` values are left untouched.
 *
 * @param route - The x402 `RouteConfig` whose vacant `payTo` fields will be filled.
 * @param evmAddress - EVM receiver address for `eip155:*` payment options.
 * @param svmAddress - Solana receiver address for `solana:*` payment options.
 * @returns A new `RouteConfig` with all blank `payTo` fields resolved.
 */
function fillX402RoutePayTo(
  route: RouteConfig,
  evmAddress: Address | "",
  svmAddress: string,
): RouteConfig {
  const accepts = Array.isArray(route.accepts) ? route.accepts : [route.accepts];

  const filled = accepts.map(option => {
    const network = option.network as string;
    assertSchemeSupportsNetwork(option.scheme as string, network);

    if (typeof option.payTo !== "string" || option.payTo.trim() !== "") {
      return option;
    }
    if (network.startsWith("eip155:")) {
      assertNonEmptyPayTo(evmAddress, network);
      return { ...option, payTo: evmAddress };
    }
    if (network.startsWith("solana:")) {
      assertNonEmptyPayTo(svmAddress, network);
      return { ...option, payTo: svmAddress };
    }
    throw new Error(
      `Cannot fill vacant payTo for network "${network}": unrecognised network family. ` +
        `Provide an explicit payTo address for this route option.`,
    );
  });

  return {
    ...route,
    accepts: Array.isArray(route.accepts) ? filled : filled[0]!,
  };
}

/**
 * Converts a simplified `CdpRouteConfig` into a full x402 `RouteConfig`, wiring
 * the provisioned receiver addresses into each payment option's `payTo`.
 *
 * @param route - Simplified CDP route config with `price` and optional fields.
 * @param evmAddress - EVM receiver address for `eip155:*` networks (`""` when none).
 * @param svmAddress - Solana receiver address for `solana:*` networks (`""` when none).
 * @param environment - Deployment environment controlling default network selection.
 * @param available - Which receiver families have an address. When the route
 *   relies on default networks, families without a receiver address are dropped
 *   so e.g. an EVM-only `payToConfig` works without listing `networks` explicitly.
 * @returns A full x402 `RouteConfig` with `accepts`, `payTo`, and `scheme` resolved.
 */
function convertCdpRoute(
  route: CdpRouteConfig,
  evmAddress: Address | "",
  svmAddress: string,
  environment: "production" | "development",
  available: NetworkFamilies,
): RouteConfig {
  const scheme = route.scheme ?? "exact";
  const usingDefaultNetworks = route.networks === undefined;
  const defaultNetworks = getDefaultNetworksForScheme(scheme, environment);
  /*
   * For default networks, drop families that have no receiver address so a
   * partial payToConfig (e.g. EVM-only) doesn't fail on an unused default
   * network. Explicit `networks` are always honored (and validated) as-is.
   */
  const networks = usingDefaultNetworks
    ? defaultNetworks.filter(network => {
        const family = networkFamily(network);
        if (family === "evm") return available.evm;
        if (family === "svm") return available.svm;
        return true;
      })
    : route.networks!;

  if (networks.length === 0) {
    throw new Error(
      `No receiver address available for any default network of scheme "${scheme}". ` +
        `Provide a receiver address via payToConfig (e.g. { type: "address", evm: "0x...", solana: "..." }), ` +
        `set explicit \`networks\` on the route, or use payToConfig: { type: "eoa" } to auto-provision a CDP wallet.`,
    );
  }

  const maxTimeoutSeconds = route.maxTimeoutSeconds ?? 300;

  const accepts = networks.map(network => {
    assertSchemeSupportsNetwork(scheme, network);

    const payTo = network.startsWith("eip155:")
      ? (evmAddress as string)
      : network.startsWith("solana:")
        ? (svmAddress as string)
        : (() => {
            throw new Error(
              `Cannot resolve payTo for network "${network}": unrecognised network family.`,
            );
          })();
    assertNonEmptyPayTo(payTo, network);
    return {
      scheme,
      price: route.price,
      network: network as `${string}:${string}`,
      payTo,
      maxTimeoutSeconds,
    };
  });

  return {
    accepts: accepts.length === 1 ? accepts[0]! : accepts,
    ...(route.description !== undefined && { description: route.description }),
    ...(route.extensions !== undefined && { extensions: route.extensions }),
  };
}

/**
 * Parses an x402 route pattern key (`"GET /report"`) into its HTTP method and
 * path components for building a Bazaar discovery declaration. Returns `undefined`
 * when the pattern lacks a method prefix or uses a wildcard verb.
 *
 * @param pattern - Route pattern key, e.g. `"GET /report"` or `"POST /orders/:id"`.
 * @returns Parsed `{ method, path }` pair, or `undefined` when not parseable.
 */
function parseRouteKeyForBazaar(pattern: string): { method: string; path: string } | undefined {
  const spaceIdx = pattern.indexOf(" ");
  if (spaceIdx === -1) return undefined;

  const method = pattern.slice(0, spaceIdx).toUpperCase();
  const path = pattern.slice(spaceIdx + 1);

  if (method === "*" || !path.startsWith("/")) return undefined;
  return { method, path };
}

/**
 * Returns `true` when any payment option on a resolved route targets an EVM
 * (`eip155:*`) network. Used to gate EVM-specific extensions so a Solana-only
 * route doesn't advertise EVM gas-sponsoring keys.
 *
 * @param route - Resolved x402 `RouteConfig` to inspect.
 * @returns `true` if at least one accept option is on an EVM network.
 */
function routeHasEvmAccept(route: RouteConfig): boolean {
  const accepts = Array.isArray(route.accepts) ? route.accepts : [route.accepts];
  return accepts.some(option => (option.network as string).startsWith("eip155:"));
}

/**
 * Merges CDP auto-injected extensions into a resolved route config. Gas-sponsoring
 * extensions are added only to routes with an EVM (`eip155:*`) payment option
 * (they are meaningless for Solana-only routes); the Bazaar declaration is built
 * from the route pattern for all routes. User-provided `route.extensions` always win.
 *
 * @param pattern - Route key (e.g. `"GET /report"`) used to derive Bazaar metadata.
 * @param route - Resolved x402 `RouteConfig` to augment with CDP extensions.
 * @returns A new `RouteConfig` with CDP extensions merged in.
 */
function withAutoInjectedExtensions(pattern: string, route: RouteConfig): RouteConfig {
  const bazaar = parseRouteKeyForBazaar(pattern);

  return {
    ...route,
    extensions: {
      ...(routeHasEvmAccept(route) && CDP_SUPPORTED_EXTENSIONS),
      ...(bazaar && { [CDP_EXTENSION_BAZAAR]: buildBazaarDeclaration(bazaar.method, bazaar.path) }),
      ...route.extensions,
    },
  };
}

/**
 * Resolves a mixed `Record<string, CdpRouteConfig | RouteConfig>` into the x402
 * `RoutesConfig` format. Simplified routes are expanded; full x402 routes have
 * vacant `payTo` fields filled. All CDP extensions are injected into every route.
 *
 * @param routes - Map of route patterns to simplified or full x402 route configs.
 * @param evmAddress - EVM receiver address for `eip155:*` payment options (`""` when none).
 * @param svmAddress - Solana receiver address for `solana:*` payment options (`""` when none).
 * @param environment - Deployment environment controlling default network selection.
 * @returns A fully resolved `RoutesConfig` ready to pass to an HTTP resource server.
 */
function resolveRoutes(
  routes: Record<string, CdpRouteConfig | RouteConfig>,
  evmAddress: Address | "",
  svmAddress: string,
  environment: "production" | "development",
): RoutesConfig {
  const result: Record<string, RouteConfig> = {};
  const available: NetworkFamilies = { evm: evmAddress !== "", svm: svmAddress !== "" };

  for (const [pattern, route] of Object.entries(routes)) {
    const resolved =
      "accepts" in route
        ? fillX402RoutePayTo(route, evmAddress, svmAddress)
        : convertCdpRoute(route, evmAddress, svmAddress, environment, available);
    result[pattern] = withAutoInjectedExtensions(pattern, resolved);
  }

  return result;
}

/**
 * Loads and parses a JSON config file, stripping `configPath` from the result
 * to prevent circular references when the field is present in the file itself.
 *
 * Security: this file may carry credentials (`apiKeySecret` / `walletSecret`).
 * Prefer supplying credentials via environment variables and reserving the
 * config file for `routes`; if secrets are stored here, keep the file out of
 * version control (e.g. add it to `.gitignore`).
 *
 * @param filePath - Absolute or relative path to the JSON config file.
 * @returns Parsed config with `configPath` removed.
 */
async function loadConfigFile(filePath: string): Promise<Omit<CdpX402ServerConfig, "configPath">> {
  const content = await readFile(filePath, "utf-8");
  const parsed = JSON.parse(content) as CdpX402ServerConfig;
  const result: Omit<CdpX402ServerConfig, "configPath"> = { ...parsed };
  delete (result as CdpX402ServerConfig).configPath;
  return result;
}

/*
 * ---------------------------------------------------------------------------
 * X402Server class
 * ---------------------------------------------------------------------------
 */

/**
 * A CDP-powered x402 resource server that **extends** `x402HTTPResourceServer`.
 *
 * It is a drop-in replacement anywhere an `x402HTTPResourceServer` is
 * expected — pass it directly to `paymentMiddlewareFromHTTPServer`, Hono /
 * Next.js adapters, or any other framework integration.
 *
 * Use `createX402Server()` (or `X402Server.create()`) to obtain an initialized
 * instance. The constructor is intentionally private; call the factory instead.
 *
 * In addition to the full `x402HTTPResourceServer` surface (`initialize()`,
 * `processHTTPRequest()`, `processSettlement()`, `requiresPayment()`, etc.)
 * this class exposes `payToEvmAddress` and `payToSvmAddress` for the
 * provisioned receiver wallets.
 */
export class X402Server extends x402HTTPResourceServer {
  /**
   * EVM address of the receiver wallet. `undefined` when no EVM wallet was
   * provisioned (no `eip155:*` route, and `payToConfig` did not supply an
   * `evm` address).
   */
  readonly payToEvmAddress: Address | undefined;
  /**
   * Solana address of the provisioned receiver wallet. `undefined` when no
   * Solana wallet was provisioned (no `solana:*` route, and `payToConfig` did
   * not supply a `solana` address).
   */
  readonly payToSvmAddress: string | undefined;
  /**
   * Owner account name for `"smart"` receiver wallets, otherwise `undefined`.
   * Only set when `payToConfig.type` is `"smart"`.
   */
  readonly ownerWallet: string | undefined;

  private _initPromise: Promise<void> | null = null;

  /**
   * Private constructor — use `createX402Server()` or `X402Server.create()` instead.
   *
   * @param resourceServer - Initialized `x402ResourceServer` with schemes registered.
   * @param routes - Resolved `RoutesConfig` with `payTo` and extensions filled in.
   * @param payToEvmAddress - EVM address of the provisioned receiver wallet,
   *   or `undefined` if none was provisioned.
   * @param payToSvmAddress - Solana address of the provisioned receiver wallet,
   *   or `undefined` if none was provisioned.
   * @param ownerWallet - Owner account name for smart wallets, otherwise `undefined`.
   * @internal
   */
  private constructor(
    resourceServer: x402ResourceServer,
    routes: RoutesConfig,
    payToEvmAddress: Address | undefined,
    payToSvmAddress: string | undefined,
    ownerWallet?: string,
  ) {
    super(resourceServer, routes);
    this.payToEvmAddress = payToEvmAddress;
    this.payToSvmAddress = payToSvmAddress;
    this.ownerWallet = ownerWallet;
  }

  /**
   * The underlying `x402ResourceServer` with EVM and Solana schemes registered.
   *
   * @returns The `x402ResourceServer` instance used by this server.
   */
  get resourceServer(): x402ResourceServer {
    return this.server;
  }

  /**
   * Provisions CDP receiver wallets (unless `payToConfig.type` is `"address"`),
   * resolves routes, constructs the HTTP resource server, and syncs supported
   * schemes with the CDP facilitator.
   *
   * This is the async entry point for `X402Server`. Prefer the module-level
   * `createX402Server()` wrapper for convenience.
   *
   * @param config - Credential, wallet, and route configuration.
   * @returns A fully initialized `X402Server` instance ready to be passed to
   *   any framework middleware.
   */
  static async create(config: CdpX402ServerConfig): Promise<X402Server> {
    /*
     * 1. Merge file config (if any) with inline config; inline takes precedence.
     *    Routes are deep-merged so both file and inline routes are preserved;
     *    inline routes win on conflicting keys.
     */
    let merged = config;
    if (config.configPath) {
      const fileConfig = await loadConfigFile(config.configPath);
      merged = {
        ...fileConfig,
        ...config,
        routes: { ...fileConfig.routes, ...config.routes },
      };
    }

    // 2. Validate routes before doing any I/O (fail fast before wallet provisioning).
    const routes = merged.routes;
    if (!routes || Object.keys(routes).length === 0) {
      throw new Error("createX402Server requires at least one payment route.");
    }

    // 3. Resolve credentials and environment (config → CDP_* env var fallbacks).
    const credentials = resolveServerCredentials(merged);
    const { environment } = credentials;

    // 4. Build the CDP facilitator client and x402ResourceServer.
    const facilitatorClient = createCdpFacilitatorClient({
      apiKeyId: credentials.apiKeyId,
      apiKeySecret: credentials.apiKeySecret,
    });

    const resourceServer = new x402ResourceServer(facilitatorClient);
    for (const scheme of getCdpDefaultSchemes()) {
      resourceServer.register(scheme.network as Network, scheme.server);
    }
    for (const ext of getCdpExtensionRegistrations()) {
      resourceServer.registerExtension(ext);
    }

    // 5. Resolve payTo addresses — provision wallets or use provided addresses.
    const payToConfig = merged.payToConfig;
    let evmAddress: Address | "";
    let svmAddress: string;
    let ownerWallet: string | undefined;

    if (payToConfig?.type === "address") {
      evmAddress = payToConfig.evm ?? "";
      svmAddress = payToConfig.solana ?? "";
    } else {
      const missing: string[] = [];
      if (!credentials.apiKeyId) missing.push("CDP_API_KEY_ID");
      if (!credentials.apiKeySecret) missing.push("CDP_API_KEY_SECRET");
      if (!credentials.walletSecret) missing.push("CDP_WALLET_SECRET");
      if (missing.length > 0) {
        throw new Error(
          `Missing required CDP credentials: ${missing.join(", ")}. ` +
            "Provide them via config options or set the corresponding environment variables " +
            "(CDP_API_KEY_ID / CDP_API_KEY_SECRET / CDP_WALLET_SECRET). " +
            "Alternatively, pass payToConfig: { type: 'address', evm: '0x...', solana: '...' } to skip wallet provisioning.",
        );
      }

      /*
       * Only provision the wallet families the routes actually reference, so an
       * EVM-only server never creates a Solana account (and vice versa).
       */
      const need = requiredNetworkFamilies(routes, environment);
      const provisioned = await provisionServerAccounts(
        {
          apiKeyId: credentials.apiKeyId!,
          apiKeySecret: credentials.apiKeySecret!,
          walletSecret: credentials.walletSecret!,
        },
        (payToConfig ?? { type: "eoa" }) as Exclude<PayToConfig, { type: "address" }>,
        need,
      );

      evmAddress = provisioned.evmAddress;
      svmAddress = provisioned.svmAddress;
      ownerWallet = provisioned.ownerWallet;
    }

    // 6. Resolve routes (simplified CDP format or full x402 format).
    const resolvedRoutes = resolveRoutes(routes, evmAddress, svmAddress, environment);

    /*
     * 7. Guard: batch-settlement stores per-channel state keyed to the receiver address,
     *    so only one receiver address is valid per server instance.
     *    Collect all distinct payTo values used in batch-settlement routes (scanning
     *    both simplified and full x402 RouteConfig formats), then reject the config
     *    if more than one distinct address is found.
     */
    const batchPayTos = new Set<string>();
    for (const route of Object.values(resolvedRoutes)) {
      const accepts = Array.isArray(route.accepts) ? route.accepts : [route.accepts];
      for (const opt of accepts) {
        if ((opt.scheme as string) === "batch-settlement" && opt.payTo) {
          batchPayTos.add((opt.payTo as string).toLowerCase());
        }
      }
    }
    if (batchPayTos.size > 1) {
      throw new Error(
        `batch-settlement routes must all share the same EVM receiver address within one ` +
          `X402Server instance. ${batchPayTos.size} distinct addresses found: ` +
          `${[...batchPayTos].join(", ")}. ` +
          `Create separate X402Server instances for routes with different receivers.`,
      );
    }

    /*
     * 8. Register batch-settlement scheme only for EVM receiver addresses actually
     *    used by a batch-settlement route. BatchSettlementEvmScheme requires the
     *    receiver address at construction time; scanning resolved routes (rather
     *    than unconditionally registering for `evmAddress`) ensures exact/upto-only
     *    servers never speculatively register a scheme they'll never use, while
     *    still covering full x402 RouteConfigs with an explicit payTo.
     */
    const batchAddresses = new Set<Address>();
    for (const route of Object.values(resolvedRoutes)) {
      const accepts = Array.isArray(route.accepts) ? route.accepts : [route.accepts];
      for (const opt of accepts) {
        if ((opt.scheme as string) === "batch-settlement" && opt.payTo) {
          batchAddresses.add(opt.payTo as Address);
        }
      }
    }
    for (const addr of batchAddresses) {
      const reg = getCdpBatchSettlementScheme(addr);
      resourceServer.register(reg.network as Network, reg.server);
    }

    // 9. Construct and initialize — syncs supported schemes with the facilitator.
    const instance = new X402Server(
      resourceServer,
      resolvedRoutes,
      evmAddress === "" ? undefined : evmAddress,
      svmAddress === "" ? undefined : svmAddress,
      ownerWallet,
    );
    await instance.initialize();
    return instance;
  }

  /**
   * Initializes the underlying resource server (facilitator support sync +
   * route validation) exactly once.
   *
   * `createX402Server()` already calls this before returning, and framework
   * adapters such as `paymentMiddlewareFromHTTPServer` call `initialize()`
   * again on startup. The base implementation re-fetches facilitator support
   * on every call, so this override memoizes the first run to avoid a redundant
   * facilitator round-trip. The promise is cleared on failure so a later call
   * can retry.
   *
   * @returns A promise that resolves once initialization has completed.
   */
  override async initialize(): Promise<void> {
    if (!this._initPromise) {
      this._initPromise = super.initialize().catch(error => {
        this._initPromise = null;
        throw error;
      });
    }
    return this._initPromise;
  }
}

/*
 * ---------------------------------------------------------------------------
 * Public factory
 * ---------------------------------------------------------------------------
 */

/**
 * Creates and initializes a CDP-powered x402 resource server.
 *
 * Returns an `X402Server` which **extends** `x402HTTPResourceServer` and can
 * be passed directly to `paymentMiddlewareFromHTTPServer` or any other
 * framework adapter.
 *
 * All credential fields fall back to environment variables; an empty `{}`
 * with a `routes` map is sufficient in most environments.
 *
 * Pass `payToConfig: { type: "address", evm: "0x...", solana: "..." }` to
 * provide your own receiver addresses without provisioning a CDP wallet.
 *
 * @param config - Credential, wallet, and route configuration. All credential fields
 *   fall back to environment variables; `routes` is the only required field (or
 *   `configPath` pointing to a JSON file that supplies routes).
 * @returns A fully initialized `X402Server` ready to be passed to any framework middleware.
 * @example Minimal setup (auto-provisions receiver wallet):
 * ```typescript
 * // Set: CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET
 * const server = await createX402Server({
 *   routes: {
 *     "GET /report": { price: "$0.01", description: "AI-generated report" },
 *   },
 * });
 * app.use(paymentMiddlewareFromHTTPServer(server));
 * console.log("EVM receiver:", server.payToEvmAddress);
 * ```
 *
 * @example Bring your own addresses:
 * ```typescript
 * const server = await createX402Server({
 *   routes: { "GET /report": { price: "$0.01" } },
 *   payToConfig: { type: "address", evm: "0x1234...", solana: "ABC..." },
 * });
 * ```
 *
 * @example Full x402 RouteConfig format with vacant payTo:
 * ```typescript
 * const server = await createX402Server({
 *   routes: {
 *     "GET /report": {
 *       accepts: { scheme: "exact", price: "$0.01", network: "eip155:8453", payTo: "" },
 *     },
 *   },
 * });
 * ```
 *
 * @example Config-file variant:
 * ```typescript
 * // x402.config.json: { "routes": { "GET /report": { "price": "$0.01" } } }
 * const server = await createX402Server({ configPath: "./x402.config.json" });
 * ```
 */
export async function createX402Server(config: CdpX402ServerConfig): Promise<X402Server> {
  return X402Server.create(config);
}

export type { RoutesConfig, RouteConfig } from "@x402/core/server";
