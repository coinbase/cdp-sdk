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
import { CdpClient } from "../client/cdp.js";

import type { RoutesConfig, RouteConfig } from "@x402/core/server";
import type { Network } from "@x402/core/types";

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
export const CDP_SERVER_DEFAULT_NETWORKS: string[] = [
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
export const CDP_SERVER_DEVELOPMENT_NETWORKS: string[] = [
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
      evm?: `0x${string}`;
      /** Solana address to receive payments. */
      solana?: string;
    };

/**
 * Configuration for `createX402Server()`.
 *
 * All credential fields fall back to environment variables, so an empty
 * object `{}` with a `routes` map is sufficient in most environments.
 * Server-specific env vars (`CDP_SERVER_API_KEY_ID`, etc.) take precedence
 * over generic vars (`CDP_API_KEY_ID`, etc.) so a single process can act as
 * both payer and receiver without variable collisions.
 *
 * Pass `configPath` to load routes (and optionally credentials) from a JSON
 * file instead of specifying them inline.
 */
export interface CdpX402ServerConfig {
  /**
   * CDP API key ID.
   * Falls back to `CDP_SERVER_API_KEY_ID`, then `CDP_API_KEY_ID` env var.
   */
  apiKeyId?: string;
  /**
   * CDP API key secret.
   * Falls back to `CDP_SERVER_API_KEY_SECRET`, then `CDP_API_KEY_SECRET` env var.
   */
  apiKeySecret?: string;
  /**
   * CDP wallet secret used to provision the receiver wallet.
   * Falls back to `CDP_SERVER_WALLET_SECRET`, then `CDP_WALLET_SECRET` env var.
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
   * same field.
   */
  configPath?: string;
}

/*
 * ---------------------------------------------------------------------------
 * Internal wallet provisioning
 * ---------------------------------------------------------------------------
 */

interface ProvisionedAddresses {
  evmAddress: `0x${string}`;
  svmAddress: string;
  ownerWallet?: string;
}

/**
 * Resolves server-scoped CDP credentials and environment, falling back from
 * explicit config → `CDP_SERVER_*` env vars → generic `CDP_*` env vars.
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
    apiKeyId: config.apiKeyId ?? process.env.CDP_SERVER_API_KEY_ID ?? process.env.CDP_API_KEY_ID,
    apiKeySecret:
      config.apiKeySecret ??
      process.env.CDP_SERVER_API_KEY_SECRET ??
      process.env.CDP_API_KEY_SECRET,
    walletSecret:
      config.walletSecret ?? process.env.CDP_SERVER_WALLET_SECRET ?? process.env.CDP_WALLET_SECRET,
    environment,
  };
}

/**
 * Returns `true` when the CDP API rejected a smart account creation because the
 * owner EOA already has a smart wallet registered under a different name.
 *
 * @param error - The caught error value to inspect.
 * @returns `true` if the error indicates an owner already has a smart wallet.
 */
function isOwnerAlreadyHasSmartWalletError(error: unknown): boolean {
  return (
    error instanceof Error && error.message.includes("Multiple smart wallets with the same owner")
  );
}

/**
 * Paginates through all smart accounts in the CDP project to find one owned by
 * the given address. Used as a recovery path when `getOrCreateSmartAccount`
 * fails because the owner already has a smart wallet under a different name.
 *
 * @param cdpClient - The CDP client to use for listing accounts.
 * @param ownerAddress - Owner EOA address to match (case-insensitive).
 * @returns The first matching smart account address, or `undefined` if none found.
 */
async function findSmartAccountByOwner(
  cdpClient: CdpClient,
  ownerAddress: string,
): Promise<string | undefined> {
  const normalizedOwner = ownerAddress.toLowerCase();
  let pageToken: string | undefined;
  do {
    const result = await cdpClient.evm.listSmartAccounts({ pageToken });
    const match = result.accounts.find(a => a.owners[0]?.toLowerCase() === normalizedOwner);
    if (match) return match.address;
    pageToken = result.nextPageToken;
  } while (pageToken);
  return undefined;
}

/**
 * Provisions CDP EVM and Solana receiver accounts for use as `payTo` addresses.
 *
 * @param credentials - CDP API credentials for wallet operations.
 * @param credentials.apiKeyId - CDP API key ID.
 * @param credentials.apiKeySecret - CDP API key secret.
 * @param credentials.walletSecret - CDP wallet secret for signing.
 * @param payToConfig - Resolved wallet type (`"eoa"` or `"smart"`) and account names.
 * @returns Provisioned EVM address, Solana address, and optional owner wallet name.
 */
async function provisionServerAccounts(
  credentials: { apiKeyId: string; apiKeySecret: string; walletSecret: string },
  payToConfig: Exclude<PayToConfig, { type: "address" }>,
): Promise<ProvisionedAddresses> {
  const cdpClient = new CdpClient({
    apiKeyId: credentials.apiKeyId,
    apiKeySecret: credentials.apiKeySecret,
    walletSecret: credentials.walletSecret,
  });

  const accountName = payToConfig.accountName ?? DEFAULT_SERVER_ACCOUNT_NAME;
  const svmAccount = await cdpClient.solana.getOrCreateAccount({ name: accountName });

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
          address: existingAddress as `0x${string}`,
          owner: ownerAccount,
        });
      } else {
        throw error;
      }
    }

    return {
      evmAddress: smartAccount.address as `0x${string}`,
      svmAddress: svmAccount.address,
      ownerWallet: payToConfig.ownerAccountName,
    };
  }

  const evmAccount = await cdpClient.evm.getOrCreateAccount({ name: accountName });
  return {
    evmAddress: evmAccount.address as `0x${string}`,
    svmAddress: svmAccount.address,
  };
}

/*
 * ---------------------------------------------------------------------------
 * Route resolution helpers
 * ---------------------------------------------------------------------------
 */

/**
 * Returns `true` when a `payTo` string should be treated as vacant (empty or
 * whitespace-only) and eligible to be filled by the server.
 *
 * @param payTo - The `payTo` string to test.
 * @returns `true` if the string is blank.
 */
function isVacantPayTo(payTo: string): boolean {
  return payTo.trim() === "";
}

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
  evmAddress: `0x${string}`,
  svmAddress: string,
): RouteConfig {
  const accepts = Array.isArray(route.accepts) ? route.accepts : [route.accepts];

  const filled = accepts.map(option => {
    const network = option.network as string;
    assertSchemeSupportsNetwork(option.scheme as string, network);

    if (typeof option.payTo !== "string" || !isVacantPayTo(option.payTo)) {
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
 * @param evmAddress - EVM receiver address for `eip155:*` networks.
 * @param svmAddress - Solana receiver address for `solana:*` networks.
 * @param environment - Deployment environment controlling default network selection.
 * @returns A full x402 `RouteConfig` with `accepts`, `payTo`, and `scheme` resolved.
 */
function convertCdpRoute(
  route: CdpRouteConfig,
  evmAddress: `0x${string}`,
  svmAddress: string,
  environment: "production" | "development",
): RouteConfig {
  const scheme = route.scheme ?? "exact";
  const defaultEvmNetworks =
    environment === "development"
      ? CDP_SERVER_DEVELOPMENT_EVM_NETWORKS
      : CDP_SERVER_DEFAULT_EVM_NETWORKS;
  const defaultNetworks =
    environment === "development" ? CDP_SERVER_DEVELOPMENT_NETWORKS : CDP_SERVER_DEFAULT_NETWORKS;
  const defaultNetworksForScheme = isEvmOnlyScheme(scheme) ? defaultEvmNetworks : defaultNetworks;
  const networks = route.networks ?? defaultNetworksForScheme;
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
 * Merges CDP auto-injected extensions into a resolved route config. Gas-sponsoring
 * extensions are added to every route; the Bazaar declaration is built from the
 * route pattern. User-provided `route.extensions` always win.
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
      ...CDP_SUPPORTED_EXTENSIONS,
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
 * @param evmAddress - EVM receiver address for `eip155:*` payment options.
 * @param svmAddress - Solana receiver address for `solana:*` payment options.
 * @param environment - Deployment environment controlling default network selection.
 * @returns A fully resolved `RoutesConfig` ready to pass to an HTTP resource server.
 */
function resolveRoutes(
  routes: Record<string, CdpRouteConfig | RouteConfig>,
  evmAddress: `0x${string}`,
  svmAddress: string,
  environment: "production" | "development",
): RoutesConfig {
  const result: Record<string, RouteConfig> = {};

  for (const [pattern, route] of Object.entries(routes)) {
    const resolved =
      "accepts" in route
        ? fillX402RoutePayTo(route, evmAddress, svmAddress)
        : convertCdpRoute(route, evmAddress, svmAddress, environment);
    result[pattern] = withAutoInjectedExtensions(pattern, resolved);
  }

  return result;
}

/**
 * Loads and parses a JSON config file, stripping `configPath` from the result
 * to prevent circular references when the field is present in the file itself.
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
   * EVM address of the receiver wallet. Empty string `""` when `payToConfig` is
   * `{ type: "address" }` and no `evm` field was provided.
   */
  readonly payToEvmAddress: `0x${string}` | "";
  /** Solana address of the provisioned receiver wallet. */
  readonly payToSvmAddress: string;
  /**
   * Owner account name for `"smart"` receiver wallets, otherwise `undefined`.
   * Only set when `payToConfig.type` is `"smart"`.
   */
  readonly ownerWallet: string | undefined;

  private readonly _resolvedRoutes: RoutesConfig;

  /**
   * Private constructor — use `createX402Server()` or `X402Server.create()` instead.
   *
   * @param resourceServer - Initialized `x402ResourceServer` with schemes registered.
   * @param routes - Resolved `RoutesConfig` with `payTo` and extensions filled in.
   * @param payToEvmAddress - EVM address of the provisioned receiver wallet.
   * @param payToSvmAddress - Solana address of the provisioned receiver wallet.
   * @param ownerWallet - Owner account name for smart wallets, otherwise `undefined`.
   * @internal
   */
  private constructor(
    resourceServer: x402ResourceServer,
    routes: RoutesConfig,
    payToEvmAddress: `0x${string}` | "",
    payToSvmAddress: string,
    ownerWallet?: string,
  ) {
    super(resourceServer, routes);
    this._resolvedRoutes = routes;
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
   * Resolved route config map with `payTo` and extensions filled in.
   *
   * Useful when bridging to framework middleware that requires a separate
   * `routes` argument, for example when wiring a sync-style middleware that
   * accepts routes and a server independently.
   *
   * @returns The `RoutesConfig` passed to the underlying HTTP resource server.
   */
  get resolvedRoutes(): RoutesConfig {
    return this._resolvedRoutes;
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

    // 3. Resolve credentials and environment (server-scoped → generic fallbacks).
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
    let evmAddress: `0x${string}`;
    let svmAddress: string;
    let ownerWallet: string | undefined;

    if (payToConfig?.type === "address") {
      evmAddress = payToConfig.evm ?? ("" as `0x${string}`);
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
            "(server-scoped: CDP_SERVER_API_KEY_ID / CDP_SERVER_API_KEY_SECRET / CDP_SERVER_WALLET_SECRET; " +
            "generic: CDP_API_KEY_ID / CDP_API_KEY_SECRET / CDP_WALLET_SECRET). " +
            "Alternatively, pass payToConfig: { type: 'address', evm: '0x...', solana: '...' } to skip wallet provisioning.",
        );
      }

      const provisioned = await provisionServerAccounts(
        {
          apiKeyId: credentials.apiKeyId!,
          apiKeySecret: credentials.apiKeySecret!,
          walletSecret: credentials.walletSecret!,
        },
        (payToConfig ?? { type: "eoa" }) as Exclude<PayToConfig, { type: "address" }>,
      );

      evmAddress = provisioned.evmAddress;
      svmAddress = provisioned.svmAddress;
      ownerWallet = provisioned.ownerWallet;
    }

    // 6. Resolve routes (simplified CDP format or full x402 format).
    const resolvedRoutes = resolveRoutes(routes, evmAddress, svmAddress, environment);

    /*
     * 5b. Register batch-settlement scheme for all EVM receiver addresses used in
     *     resolved routes. BatchSettlementEvmScheme requires the receiver address at
     *     construction time. Scanning resolved routes ensures full x402 RouteConfigs
     *     with an explicit payTo (and no provisioned evmAddress) are also covered.
     */
    const batchAddresses = new Set<`0x${string}`>();
    if (evmAddress) batchAddresses.add(evmAddress);
    for (const route of Object.values(resolvedRoutes)) {
      const accepts = Array.isArray(route.accepts) ? route.accepts : [route.accepts];
      for (const opt of accepts) {
        if ((opt.scheme as string) === "batch-settlement" && opt.payTo) {
          batchAddresses.add(opt.payTo as `0x${string}`);
        }
      }
    }
    for (const addr of batchAddresses) {
      const reg = getCdpBatchSettlementScheme(addr);
      resourceServer.register(reg.network as Network, reg.server);
    }

    // 7. Construct and initialize — syncs supported schemes with the facilitator.
    const instance = new X402Server(
      resourceServer,
      resolvedRoutes,
      evmAddress,
      svmAddress,
      ownerWallet,
    );
    await instance.initialize();
    return instance;
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
 * with a `routes` map is sufficient in most environments. Server-specific
 * env vars (`CDP_SERVER_API_KEY_ID`, `CDP_SERVER_API_KEY_SECRET`,
 * `CDP_SERVER_WALLET_SECRET`) take precedence over the generic payer-side
 * vars (`CDP_API_KEY_ID`, etc.) so a single process can act as both payer
 * and receiver without variable collisions.
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
