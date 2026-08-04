/**
 * CDP-opinionated extension wiring for the x402 payment protocol.
 *
 * `createX402Server` advertises the extensions below on the routes each one
 * applies to. Gas-sponsoring extensions are static (presence of the key is
 * enough) and EVM-only. Bazaar is built per-route from the route key and any
 * user-provided overrides. Builder code is EVM-only and always injected, for
 * on-chain attribution of payments received through the CDP SDK; setting
 * `builderCode` on the server config additionally declares the app's own code.
 *
 * | Key | Auto-injected on | Notes |
 * |-----|------------------|-------|
 * | `"eip2612GasSponsoring"` | EVM routes | Sponsored Permit2 via EIP-2612 permit |
 * | `"erc20ApprovalGasSponsoring"` | EVM routes | Sponsored ERC-20 approve tx |
 * | `"bazaar"` | every route | Minimal discovery metadata built from route pattern |
 * | `"builder-code"` | EVM routes | ERC-8021 attribution: SDK service code (`s`), plus app code (`a`) when `builderCode` is set |
 *
 * Users who need richer Bazaar metadata (queryParams, body example, output
 * schema, etc.) can override by setting `extensions.bazaar` on the route —
 * their value takes precedence over the auto-generated one.
 */

import { ExactEvmScheme } from "@x402/evm/exact/server";
import { UptoEvmScheme } from "@x402/evm/upto/server";
import { bazaarResourceServerExtension } from "@x402/extensions/bazaar";
import { BUILDER_CODE, builderCodeResourceServerExtension } from "@x402/extensions/builder-code";
import { ExactSvmScheme } from "@x402/svm/exact/server";

import type { ResourceServerExtension, Network, SchemeNetworkServer } from "@x402/core/types";

/*
 * ---------------------------------------------------------------------------
 * Extension key constants
 * ---------------------------------------------------------------------------
 */

/**
 * Extension key for EIP-2612 gas-sponsored Permit2 payments.
 *
 * When advertised in `PaymentRequired.extensions`, the x402 EVM client
 * automatically signs an EIP-2612 permit if Permit2 allowance is insufficient
 * — the CDP Facilitator submits the permit transaction, covering the user's gas.
 */
export const CDP_EXTENSION_GAS_SPONSORING_EIP2612 = "eip2612GasSponsoring" as const;

/**
 * Extension key for ERC-20 approval gas-sponsored payments.
 *
 * When advertised, the x402 EVM client signs an ERC-20 `approve(Permit2, MaxUint256)`
 * transaction and the CDP Facilitator broadcasts it, covering the user's gas cost.
 */
export const CDP_EXTENSION_GAS_SPONSORING_ERC20_APPROVAL = "erc20ApprovalGasSponsoring" as const;

/**
 * Extension key for Bazaar resource discovery.
 *
 * Auto-injected by `createX402Server` with a minimal `DiscoveryExtension`
 * built from the route key (HTTP method + path template). Override by
 * providing `extensions.bazaar` in your route config with richer metadata
 * (queryParams, body example, output schema, etc.).
 */
export const CDP_EXTENSION_BAZAAR = "bazaar" as const;

/**
 * Extension key for [builder-code](https://github.com/x402-foundation/x402/blob/main/specs/extensions/builder_code.md)
 * on-chain attribution (ERC-8021 Schema 2).
 *
 * Injected by `createX402Server` on every EVM route, declaring the SDK's own
 * service code (`s`) in `PaymentRequired.extensions`, plus the app code (`a`)
 * when `builderCode` is set on the server config.
 */
export const CDP_EXTENSION_BUILDER_CODE = BUILDER_CODE;

/*
 * ---------------------------------------------------------------------------
 * Auto-injected extension set
 * ---------------------------------------------------------------------------
 */

/**
 * Static extension declarations that `createX402Server` injects into every
 * route regardless of route-specific metadata.
 *
 * Both gas-sponsoring entries are present. Their presence signals to the x402
 * EVM client that the CDP Facilitator can cover Permit2 gas costs; the client
 * only activates the path when `requirements.extra.assetTransferMethod` is
 * `"permit2"`, so the declarations are harmless for EIP-3009 and Solana routes.
 *
 * Bazaar and builder-code are NOT in this set — both need a per-call declaration
 * (Bazaar carries HTTP method/path metadata; builder-code carries the SDK's
 * service code and, when configured, the app's own code).
 */
export const CDP_SUPPORTED_EXTENSIONS: Record<string, unknown> = {
  [CDP_EXTENSION_GAS_SPONSORING_EIP2612]: {},
  [CDP_EXTENSION_GAS_SPONSORING_ERC20_APPROVAL]: {},
};

/*
 * ---------------------------------------------------------------------------
 * Bazaar discovery declaration builder
 * ---------------------------------------------------------------------------
 */

/** HTTP methods that carry a request body (POST, PUT, PATCH). */
const BODY_METHODS = new Set(["POST", "PUT", "PATCH"]);

/**
 * Builds a minimal Bazaar `DiscoveryExtension` declaration from an HTTP method
 * and path template. It carries enough information for Bazaar to index the route;
 * users who need richer metadata (queryParams, body example, output schema, path-param
 * types) should override by setting `extensions.bazaar` explicitly in their route
 * config.
 *
 * Wire shape follows `github.com/x402-foundation/x402/go/extensions/bazaar`:
 * - GET/HEAD/DELETE → `QueryInput`  (`{ type, method }`)
 * - POST/PUT/PATCH  → `BodyInput`   (`{ type, method, bodyType: "json", body: {} }`)
 *
 * For body methods `body` is required by the Bazaar `BodyDiscoveryInfo` contract
 * (`body: Record<string, unknown>`). An empty object is used since the route's
 * body shape is not known at declaration time; users who need a richer schema
 * should override `extensions.bazaar` in their route config.
 *
 * @param method - Uppercase HTTP verb, e.g. `"GET"` or `"POST"`.
 * @param path   - Path template, e.g. `"/report"` or `"/users/:id"`.
 * @returns A Bazaar `DiscoveryExtension` declaration object.
 */
export function buildBazaarDeclaration(method: string, path: string): Record<string, unknown> {
  const isBodyMethod = BODY_METHODS.has(method);
  const input: Record<string, unknown> = { type: "http", method };
  if (isBodyMethod) {
    input.bodyType = "json";
    input.body = {};
  }

  const inputSchemaProperties: Record<string, unknown> = {
    type: { type: "string", const: "http" },
    method: { type: "string", enum: [method] },
  };
  const inputSchemaRequired = ["type", "method"];

  if (isBodyMethod) {
    inputSchemaProperties.bodyType = { type: "string", enum: ["json"] };
    inputSchemaProperties.body = { type: "object" };
    inputSchemaRequired.push("bodyType");
    inputSchemaRequired.push("body");
  }

  const schema: Record<string, unknown> = {
    properties: {
      input: {
        type: "object",
        properties: inputSchemaProperties,
        required: inputSchemaRequired,
        additionalProperties: false,
      },
    },
  };

  return {
    info: { input },
    schema,
    routeTemplate: path,
  };
}

/*
 * ---------------------------------------------------------------------------
 * Scheme registrations
 * ---------------------------------------------------------------------------
 */

/**
 * A scheme+network pair used to register payment schemes on an `x402ResourceServer`.
 */
export interface CdpSchemeRegistration {
  /** CAIP-2 network identifier, e.g. `"eip155:*"` or `"solana:*"`. */
  network: Network;
  /** Scheme server implementation for this network. */
  server: SchemeNetworkServer;
}

/**
 * Returns the default CDP scheme registrations:
 * - `exact` for all EVM networks (`eip155:*`)
 * - `upto` for all EVM networks (`eip155:*`)
 * - `exact` for all Solana networks (`solana:*`)
 *
 * Pass the result to `paymentMiddlewareFromConfig` (Express / Hono) or
 * any other framework adapter to replicate the same scheme coverage
 * when building middleware manually.
 *
 * @example
 * ```typescript
 * import { getCdpDefaultSchemes, createCdpFacilitatorClient } from "@coinbase/cdp-sdk/x402";
 * import { paymentMiddlewareFromConfig } from "@x402/express";
 *
 * app.use(paymentMiddlewareFromConfig(routes, createCdpFacilitatorClient(), getCdpDefaultSchemes()));
 * ```
 * @returns Array of scheme+network registrations for EVM (exact+upto) and Solana (exact).
 */
export function getCdpDefaultSchemes(): CdpSchemeRegistration[] {
  return [
    { network: "eip155:*" as Network, server: new ExactEvmScheme() },
    { network: "eip155:*" as Network, server: new UptoEvmScheme() },
    { network: "solana:*" as Network, server: new ExactSvmScheme() },
  ];
}

/*
 * ---------------------------------------------------------------------------
 * ResourceServerExtension registrations
 * ---------------------------------------------------------------------------
 */

/**
 * Returns `ResourceServerExtension` registrations for all CDP-supported extensions.
 *
 * These register enrichment handlers on `x402ResourceServer` so that routes
 * whose `extensions` include a CDP extension key get the correct
 * `PaymentRequired.extensions[key]` value.
 *
 * `createX402Server()` calls this automatically. Call it manually only when
 * building a resource server without `createX402Server`:
 *
 * ```typescript
 * import { x402ResourceServer } from "@x402/core/server";
 * import { getCdpExtensionRegistrations } from "@coinbase/cdp-sdk/x402";
 *
 * const server = new x402ResourceServer(facilitatorClient);
 * for (const ext of getCdpExtensionRegistrations()) {
 *   server.registerExtension(ext);
 * }
 * ```
 *
 * @returns Array of `ResourceServerExtension` registrations for gas-sponsoring, Bazaar, and builder-code.
 */
export function getCdpExtensionRegistrations(): ResourceServerExtension[] {
  return [
    {
      key: CDP_EXTENSION_GAS_SPONSORING_EIP2612,
      enrichPaymentRequiredResponse: async declaration => declaration ?? {},
    },
    {
      key: CDP_EXTENSION_GAS_SPONSORING_ERC20_APPROVAL,
      enrichPaymentRequiredResponse: async declaration => declaration ?? {},
    },
    bazaarResourceServerExtension,
    builderCodeResourceServerExtension,
  ];
}
