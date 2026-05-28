/**
 * CDP-powered x402 resource server.
 *
 * `createCdpResourceServer()` is the primary entry point. It accepts a
 * CDP-owned route configuration or a path to a JSON config file, provisions
 * EVM and Solana receiver wallets automatically, and returns a fully
 * initialized `CdpResourceServer`.
 *
 * `CdpResourceServer` **extends** `x402HTTPResourceServer` — it is a
 * drop-in replacement and can be passed anywhere an `x402HTTPResourceServer`
 * is expected (e.g. `paymentMiddlewareFromHTTPServer`, Hono / Next.js
 * adapters).
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
 * @example Simplified CDP format:
 * ```typescript
 * import { createCdpResourceServer } from "@coinbase/x402/server";
 * import { paymentMiddlewareFromHTTPServer } from "@x402/express";
 *
 * const server = await createCdpResourceServer({
 *   routes: {
 *     "GET /report": { price: "$0.01", description: "AI-generated report" },
 *   },
 * });
 * app.use(paymentMiddlewareFromHTTPServer(server));
 * ```
 *
 * @example Full x402 format (interop with x402HTTPResourceServer):
 * ```typescript
 * const server = await createCdpResourceServer({
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
 *
 * @example Config-file variant:
 * ```typescript
 * const server = await createCdpResourceServer({ configPath: "./x402.config.json" });
 * ```
 *
 * @packageDocumentation
 */

import { readFile } from "node:fs/promises";

import { x402ResourceServer, x402HTTPResourceServer } from "@x402/core/server";
import type { RoutesConfig, RouteConfig } from "@x402/core/server";
import type { Network, SchemeNetworkServer } from "@x402/core/types";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { UptoEvmScheme } from "@x402/evm/upto/server";
import { ExactSvmScheme } from "@x402/svm/exact/server";

import { createCdpFacilitatorClient } from "../facilitator/index.js";
import { baseMainnetCaip2, solanaMainnetCaip2 } from "../facilitator/constants.js";
import {
  type WalletConfig,
  type ResolvedWalletConfig,
  resolveWalletType,
} from "../wallets/config.js";
import { provisionCdpAccounts } from "../wallets/provision.js";
import {
  type CdpExtensions,
  CDP_SUPPORTED_EXTENSIONS,
  CDP_EXTENSION_BAZAAR,
  buildBazaarDeclaration,
  getCdpExtensionRegistrations,
} from "../extensions/index.js";

// ---------------------------------------------------------------------------
// Default networks
// ---------------------------------------------------------------------------

const DEFAULT_SERVER_ACCOUNT_NAME = "x402-receiver-wallet-1";

/**
 * Default EVM networks used when a route does not specify `networks`.
 * Points to Base mainnet (`eip155:8453`).
 */
export const CDP_SERVER_DEFAULT_EVM_NETWORKS = [baseMainnetCaip2] as const;

/**
 * Default Solana networks used when a route does not specify `networks`.
 * Points to Solana mainnet (`solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp`).
 */
export const CDP_SERVER_DEFAULT_SVM_NETWORKS = [solanaMainnetCaip2] as const;

/**
 * Default networks (Base mainnet + Solana mainnet) used when a simplified
 * `CdpRouteConfig` does not specify `networks`.
 */
export const CDP_SERVER_DEFAULT_NETWORKS: string[] = [
  ...CDP_SERVER_DEFAULT_EVM_NETWORKS,
  ...CDP_SERVER_DEFAULT_SVM_NETWORKS,
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Payment scheme identifiers supported by the simplified CDP route format.
 *
 * - `"exact"` — (default) Transfer a fixed amount, locked at signing time.
 *   Supports EVM and Solana networks.
 * - `"upto"` — Usage-based billing: the client authorizes a maximum amount
 *   and the server settles the actual amount charged (≤ max) via Permit2.
 *   EVM-only (`eip155:*`).
 * TODO: add `"batch-settlement"` back once CDP facilitator and
 * package support are fully available.
 */
export type CdpPaymentScheme = "exact" | "upto";

/**
 * Simplified CDP-owned route configuration.
 *
 * Specifying just `price` (and optionally `description` / `networks`) is
 * enough for most routes. `CdpResourceServer` automatically expands this
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
   * Defaults to `"exact"`. The `"upto"` scheme is EVM-only — `networks` must
   * not include Solana or other non-EVM chains when it is specified (an error
   * is thrown if they do). When `"upto"` is used without an explicit
   * `networks` list, the default falls back to `CDP_SERVER_DEFAULT_EVM_NETWORKS`
   * (Base mainnet only).
   *
   * The `"upto"` scheme (`UptoEvmScheme`) is registered automatically.
   */
  scheme?: CdpPaymentScheme;
  /**
   * CAIP-2 network identifiers for which the route accepts payments.
   * Defaults to `CDP_SERVER_DEFAULT_NETWORKS` (Base mainnet + Solana mainnet)
   * for the `"exact"` scheme, or `CDP_SERVER_DEFAULT_EVM_NETWORKS` (Base
   * mainnet only) for `"upto"`.
   *
   * To accept payments on specific testnets or a single chain, provide
   * explicit network IDs, e.g. `["eip155:84532"]` for Base Sepolia only.
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
   * auto-generated Bazaar declaration with richer discovery metadata —
   * queryParams, body example, output schema, path-param types, etc.
   *
   * For the full Bazaar `DiscoveryExtension` shape, see:
   * `github.com/x402-foundation/x402/go/extensions/bazaar`
   *
   * ```typescript
   * import { CDP_EXTENSION_BAZAAR } from "@coinbase/x402/extensions";
   *
   * routes: {
   *   "GET /search": {
   *     price: "$0.01",
   *     extensions: {
   *       [CDP_EXTENSION_BAZAAR]: {
   *         info: {
   *           input: {
   *             type: "http",
   *             method: "GET",
   *             queryParams: { q: "example search term" },
   *           },
   *           output: { type: "json", example: { results: [] } },
   *         },
   *         routeTemplate: "/search",
   *       },
   *     },
   *   },
   * }
   * ```
   */
  extensions?: CdpExtensions;
}

/**
 * Configuration for `createCdpResourceServer()`.
 *
 * All credential fields fall back to standard environment variables, so an
 * empty object `{}` with a `routes` map is sufficient in most CI and
 * production environments.
 *
 * Can also be stored in a JSON file and loaded via `configPath`; the schema
 * is identical (minus `configPath` itself).
 */
export interface CdpResourceServerConfig {
  /** CDP API key ID. Falls back to `CDP_SERVER_API_KEY_ID`, then `CDP_API_KEY_ID` env var. */
  apiKeyId?: string;
  /** CDP API key secret. Falls back to `CDP_SERVER_API_KEY_SECRET`, then `CDP_API_KEY_SECRET` env var. */
  apiKeySecret?: string;
  /**
   * CDP wallet secret used to provision the receiver wallet.
   * Falls back to `CDP_SERVER_WALLET_SECRET`, then `CDP_WALLET_SECRET` env var.
   */
  walletSecret?: string;
  /**
   * Wallet configuration for the receiver wallet.
   *
   * Defaults to a CDP Server Wallet (EOA) named `"x402-receiver-wallet-1"`.
   * Unlike the client wallet, receiver wallet fields do not fall back to
   * generic wallet env vars (`CDP_WALLET_TYPE`, `CDP_ACCOUNT_NAME`,
   * `CDP_OWNER_ACCOUNT_NAME`) to avoid accidentally reusing payer-side
   * wallet config in shared-process environments.
   *
   * Server-specific env fallbacks are supported instead:
   * - `CDP_SERVER_WALLET_TYPE` (defaults to `"cdp-eoa"`)
   * - `CDP_SERVER_ACCOUNT_NAME` (defaults to `"x402-receiver-wallet-1"`)
   * - `CDP_SERVER_OWNER_ACCOUNT_NAME` (required when type is `"cdp-smart"`)
   *
   * **Isolation note:** Multiple services in the same CDP project that use
   * the default config will share a single receiver wallet. Set `accountName`
   * explicitly for per-service isolation.
   */
  walletConfig?: WalletConfig;
  /**
   * Payment-protected routes served by this server.
   *
   * Map of HTTP method + path pattern → route config.
   * Keys use the `"METHOD /path"` convention, e.g. `"GET /report"`.
   *
   * Each value is either:
   * - A `CdpRouteConfig` — simplified format, just `price` + optional fields.
   *   Networks default to Base mainnet + Solana mainnet.
   * - A `RouteConfig` — full x402 format with an `accepts` array/object.
   *   Vacant `payTo` fields (`""`) are filled with the provisioned receiver
   *   address for that network family.
   *
   * Both formats can be mixed within the same map.
   * May be omitted when `configPath` supplies the routes.
   */
  routes?: Record<string, CdpRouteConfig | RouteConfig>;
  /**
   * Path to a JSON file whose fields are merged with this inline config.
   * Inline config takes precedence over file config when both specify the
   * same field. `configPath` inside the file is ignored to prevent circular
   * references.
   */
  configPath?: string;
}

/**
 * A scheme+network pair used to register payment schemes on an `x402ResourceServer`.
 *
 * Structurally compatible with `SchemeRegistration` from `@x402/express` and
 * `@x402/hono` so that `getCdpDefaultSchemes()` can be passed directly to
 * `paymentMiddlewareFromConfig` or any `createCdp*Middleware` helper.
 */
export interface CdpSchemeRegistration {
  /** CAIP-2 network identifier, e.g. `"eip155:*"` or `"solana:*"`. */
  network: Network;
  /** Scheme server implementation for this network. */
  server: SchemeNetworkServer;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Returns the default CDP scheme registrations used by `CdpResourceServer`:
 * - `exact` for all EVM networks (`eip155:*`)
 * - `upto` for all EVM networks (`eip155:*`)
 * - `exact` for all Solana networks (`solana:*`)
 *
 * Pass the result to `paymentMiddlewareFromConfig` (Express / Hono) or
 * `createCdpRouteHandler` (Next.js) to replicate the same scheme coverage
 * when building middleware manually.
 *
 * @example
 * ```typescript
 * import { getCdpDefaultSchemes } from "@coinbase/x402/server";
 * import { createCdpFacilitatorClient } from "@coinbase/x402/facilitator";
 * import { paymentMiddlewareFromConfig } from "@x402/express";
 *
 * app.use(paymentMiddlewareFromConfig(routes, createCdpFacilitatorClient(), getCdpDefaultSchemes()));
 * ```
 */
export function getCdpDefaultSchemes(): CdpSchemeRegistration[] {
  return [
    { network: "eip155:*" as Network, server: new ExactEvmScheme() },
    { network: "eip155:*" as Network, server: new UptoEvmScheme() },
    { network: "solana:*" as Network, server: new ExactSvmScheme() },
  ];
}

/**
 * Returns true when a `payTo` string should be treated as vacant and filled
 * by the server (empty or whitespace-only).
 */
function isVacantPayTo(payTo: string): boolean {
  return payTo.trim() === "";
}

/**
 * Resolves receiver wallet config for CdpResourceServer without inheriting
 * generic wallet env defaults. This avoids accidental payer/receiver wallet
 * coupling in shared-process setups while still allowing explicit
 * server-scoped env configuration.
 */
function resolveServerWalletConfig(config?: WalletConfig): ResolvedWalletConfig {
  const type = resolveWalletType(config?.type ?? process.env.CDP_SERVER_WALLET_TYPE);
  const accountName =
    config?.accountName ?? process.env.CDP_SERVER_ACCOUNT_NAME ?? DEFAULT_SERVER_ACCOUNT_NAME;
  const ownerAccountName = config?.ownerAccountName ?? process.env.CDP_SERVER_OWNER_ACCOUNT_NAME;

  if (type === "cdp-smart" && !ownerAccountName) {
    throw new Error(
      'Missing required owner account name for wallet type "cdp-smart". ' +
        "Provide it via walletConfig.ownerAccountName or set CDP_SERVER_OWNER_ACCOUNT_NAME.",
    );
  }

  return { type, accountName, ownerAccountName };
}

/**
 * Fills vacant `payTo` fields in a full x402 `RouteConfig`. Returns a new
 * object — the original is not mutated.
 *
 * @throws {Error} If a vacant `payTo` belongs to an unrecognised network family.
 */
function fillX402RoutePayTo(
  route: RouteConfig,
  evmAddress: `0x${string}`,
  svmAddress: string,
): RouteConfig {
  const accepts = Array.isArray(route.accepts) ? route.accepts : [route.accepts];

  const filled = accepts.map((option) => {
    const network = option.network as string;
    assertSchemeSupportsNetwork(option.scheme as string, network);

    if (typeof option.payTo !== "string" || !isVacantPayTo(option.payTo)) {
      return option;
    }
    if (network.startsWith("eip155:")) return { ...option, payTo: evmAddress };
    if (network.startsWith("solana:")) return { ...option, payTo: svmAddress };
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
 * Returns true when a payment scheme only supports EVM networks.
 */
function isEvmOnlyScheme(scheme: CdpPaymentScheme): boolean {
  return scheme === "upto";
}

/**
 * Throws when a scheme is configured with an unsupported network family.
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
 * Converts a simplified `CdpRouteConfig` into a full x402 `RouteConfig`,
 * wiring the provisioned receiver addresses into each payment option's `payTo`.
 *
 * @throws {Error} If a non-EVM network is specified with the EVM-only
 *   `"upto"` scheme.
 */
function convertCdpRoute(
  route: CdpRouteConfig,
  evmAddress: `0x${string}`,
  svmAddress: string,
): RouteConfig {
  const scheme = route.scheme ?? "exact";
  const defaultNetworks = isEvmOnlyScheme(scheme)
    ? CDP_SERVER_DEFAULT_EVM_NETWORKS
    : CDP_SERVER_DEFAULT_NETWORKS;
  const networks = route.networks ?? defaultNetworks;
  const maxTimeoutSeconds = route.maxTimeoutSeconds ?? 300;

  const accepts = networks.map((network) => {
    assertSchemeSupportsNetwork(scheme, network);

    return {
      scheme,
      price: route.price,
      network: network as `${string}:${string}`,
      payTo: network.startsWith("eip155:")
        ? (evmAddress as string)
        : network.startsWith("solana:")
          ? (svmAddress as string)
          : (() => {
              throw new Error(
                `Cannot resolve payTo for network "${network}": unrecognised network family.`,
              );
            })(),
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
 * Parses an x402 route pattern key into its HTTP method and path components
 * for building a Bazaar discovery declaration.
 *
 * Returns `undefined` when the method cannot be determined (no space separator,
 * wildcard `*`, or the path segment doesn't start with `/`).
 *
 * @example parseRouteKeyForBazaar("GET /report") → { method: "GET", path: "/report" }
 * @example parseRouteKeyForBazaar("POST /users/:id") → { method: "POST", path: "/users/:id" }
 * @example parseRouteKeyForBazaar("/report")  → undefined (no method)
 * @example parseRouteKeyForBazaar("* /report") → undefined (wildcard)
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
 * Merges CDP auto-injected extensions into a resolved route:
 * - Gas-sponsoring extensions (static, route-agnostic)
 * - Bazaar discovery declaration (derived from the route pattern)
 *
 * User-provided `route.extensions` are spread last so they always win.
 * In particular, providing `extensions.bazaar` with richer metadata (queryParams,
 * body example, output schema) overrides the auto-generated minimal declaration.
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
 * Resolves a mixed `Record<string, CdpRouteConfig | RouteConfig>` into the
 * x402 `RoutesConfig` format. Simplified routes are expanded; full x402
 * routes have their vacant `payTo` fields filled. All CDP extensions are
 * injected into every route automatically.
 */
function resolveRoutes(
  routes: Record<string, CdpRouteConfig | RouteConfig>,
  evmAddress: `0x${string}`,
  svmAddress: string,
): RoutesConfig {
  const result: Record<string, RouteConfig> = {};

  for (const [pattern, route] of Object.entries(routes)) {
    const resolved =
      "accepts" in route
        ? fillX402RoutePayTo(route, evmAddress, svmAddress)
        : convertCdpRoute(route, evmAddress, svmAddress);
    result[pattern] = withAutoInjectedExtensions(pattern, resolved);
  }

  return result;
}

/**
 * Loads and parses a JSON config file, stripping `configPath` to prevent
 * circular references.
 */
async function loadConfigFile(
  filePath: string,
): Promise<Omit<CdpResourceServerConfig, "configPath">> {
  const content = await readFile(filePath, "utf-8");
  const parsed = JSON.parse(content) as CdpResourceServerConfig;
  const result: Omit<CdpResourceServerConfig, "configPath"> = { ...parsed };
  delete (result as CdpResourceServerConfig).configPath;
  return result;
}

// ---------------------------------------------------------------------------
// CdpResourceServer
// ---------------------------------------------------------------------------

/**
 * A CDP-powered x402 resource server that **extends** `x402HTTPResourceServer`.
 *
 * It is a drop-in replacement anywhere an `x402HTTPResourceServer` is
 * expected — pass it directly to `paymentMiddlewareFromHTTPServer`, Hono /
 * Next.js adapters, or any other framework integration.
 *
 * Use `createCdpResourceServer()` (or `CdpResourceServer.create()`) to
 * obtain an initialized instance. The constructor is intentionally private;
 * call the factory instead.
 *
 * In addition to the full `x402HTTPResourceServer` surface (`initialize()`,
 * `processHTTPRequest()`, `processSettlement()`, `requiresPayment()`, etc.)
 * this class exposes `payToEvmAddress`, `payToSvmAddress`, and `ownerWallet` for the
 * provisioned receiver wallets.
 */
export class CdpResourceServer extends x402HTTPResourceServer {
  /** EVM address of the provisioned receiver wallet (EOA or SCW per `walletConfig`). */
  readonly payToEvmAddress: `0x${string}`;
  /** Solana address of the provisioned receiver wallet. */
  readonly payToSvmAddress: string;
  /**
   * Owner account name for `cdp-smart` receiver wallets, otherwise `undefined`.
   * Only set when `walletConfig.type` is `"cdp-smart"`.
   */
  readonly ownerWallet: string | undefined;

  private readonly _routesConfig: RoutesConfig;

  /**
   * @internal
   * Private constructor — use `createCdpResourceServer()` or
   * `CdpResourceServer.create()` instead.
   */
  private constructor(
    resourceServer: x402ResourceServer,
    routes: RoutesConfig,
    payToEvmAddress: `0x${string}`,
    payToSvmAddress: string,
    ownerWallet?: string,
  ) {
    super(resourceServer, routes);
    this._routesConfig = routes;
    this.payToEvmAddress = payToEvmAddress;
    this.payToSvmAddress = payToSvmAddress;
    this.ownerWallet = ownerWallet;
  }

  /**
   * The underlying `x402ResourceServer` with EVM and Solana schemes registered.
   * Alias for `this.server` (the parent class getter).
   */
  get resourceServer(): x402ResourceServer {
    return this.server;
  }

  /**
   * Resolved route config map with `payTo` and extensions filled in.
   *
   * Returns the `RoutesConfig` passed to the parent `x402HTTPResourceServer`
   * constructor — all `payTo` fields are populated from the provisioned
   * receiver wallets and all CDP extensions are injected.
   *
   * Useful when bridging to framework middleware that requires a separate
   * `routes` argument, for example when wiring a sync-style middleware that
   * accepts routes and a server independently.
   *
   * @see Python equivalent: `CdpResourceServer.routes_config`
   */
  get resolvedRoutes(): RoutesConfig {
    return this._routesConfig;
  }

  /**
   * Provisions CDP receiver wallets, resolves routes, constructs the HTTP
   * resource server, and syncs supported schemes with the CDP facilitator.
   *
   * This is the async entry point for `CdpResourceServer`. Prefer the
   * module-level `createCdpResourceServer()` wrapper for convenience.
   *
   * @param config - Credential, wallet, and route configuration.
   * @returns A fully initialized `CdpResourceServer` instance ready to be
   *   passed to any framework middleware.
   */
  static async create(config: CdpResourceServerConfig): Promise<CdpResourceServer> {
    // 1. Merge file config (if any) with inline config; inline takes precedence.
    let merged = config;
    if (config.configPath) {
      const fileConfig = await loadConfigFile(config.configPath);
      merged = { ...fileConfig, ...config };
    }

    // 2. Resolve server-scoped credentials: CDP_SERVER_* takes precedence over
    //    the generic CDP_API_KEY_* / CDP_WALLET_SECRET vars so that a process
    //    running both client and server roles can configure them independently.
    const apiKeyId = merged.apiKeyId ?? process.env.CDP_SERVER_API_KEY_ID;
    const apiKeySecret = merged.apiKeySecret ?? process.env.CDP_SERVER_API_KEY_SECRET;
    const walletSecret = merged.walletSecret ?? process.env.CDP_SERVER_WALLET_SECRET;

    // 3. Build the CDP facilitator client and x402ResourceServer.
    const facilitatorClient = createCdpFacilitatorClient({
      apiKeyId,
      apiKeySecret,
    });

    const resourceServer = new x402ResourceServer(facilitatorClient);
    for (const scheme of getCdpDefaultSchemes()) {
      resourceServer.register(scheme.network, scheme.server);
    }

    // Register handlers for all CDP-supported extensions. Handlers are no-ops
    // for routes that do not declare the corresponding extension key.
    for (const ext of getCdpExtensionRegistrations()) {
      resourceServer.registerExtension(ext);
    }

    // 4. Validate routes before doing any I/O (fail fast before wallet provisioning).
    const routes = merged.routes;
    if (!routes || Object.keys(routes).length === 0) {
      throw new Error("CdpResourceServer requires at least one payment route.");
    }

    // 5. Provision CDP receiver wallets.
    const walletConfig = resolveServerWalletConfig(merged.walletConfig);

    const { evmAddress, svmAddress, ownerWallet } = await provisionCdpAccounts(
      {
        apiKeyId,
        apiKeySecret,
        walletSecret,
      },
      walletConfig,
    );

    // 6. Resolve routes (simplified CDP format or full x402 format).
    const resolvedRoutes = resolveRoutes(routes, evmAddress, svmAddress);

    // 7. Construct and initialize — syncs supported schemes with the facilitator.
    const instance = new CdpResourceServer(
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

// ---------------------------------------------------------------------------
// Public factory
// ---------------------------------------------------------------------------

/**
 * Creates and initializes a CDP-powered x402 resource server.
 *
 * Returns a `CdpResourceServer` which **extends** `x402HTTPResourceServer`
 * and can be passed directly to `paymentMiddlewareFromHTTPServer` or any
 * other framework adapter.
 *
 * All credential fields fall back to environment variables; an empty `{}`
 * with a `routes` map is sufficient in most environments. Server-specific
 * env vars (`CDP_SERVER_API_KEY_ID`, `CDP_SERVER_API_KEY_SECRET`,
 * `CDP_SERVER_WALLET_SECRET`) take precedence over the generic payer-side
 * vars (`CDP_API_KEY_ID`, etc.) so a single process can act as both payer
 * and receiver without variable collisions. Pass `configPath` to load routes
 * (and optionally credentials) from a JSON file instead.
 *
 * Routes accept either the simplified `CdpRouteConfig` format (`price` +
 * optional fields) or the full x402 `RouteConfig` format (`accepts` array).
 * Vacant `payTo` fields in x402-format routes are filled automatically from
 * the provisioned receiver wallet. Both formats can be mixed.
 *
 * @example Simplified format:
 * ```typescript
 * const server = await createCdpResourceServer({
 *   routes: {
 *     "GET /report": { price: "$0.01", description: "AI-generated report" },
 *   },
 * });
 * app.use(paymentMiddlewareFromHTTPServer(server));
 * console.log("EVM receiver:", server.payToEvmAddress);
 * ```
 *
 * @example Full x402 format:
 * ```typescript
 * const server = await createCdpResourceServer({
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
 * const server = await createCdpResourceServer({ configPath: "./x402.config.json" });
 * ```
 */
export async function createCdpResourceServer(
  config: CdpResourceServerConfig,
): Promise<CdpResourceServer> {
  return CdpResourceServer.create(config);
}

export type { RoutesConfig, RouteConfig } from "@x402/core/server";
export type { SchemeNetworkServer } from "@x402/core/types";
