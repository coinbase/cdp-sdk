import { createCdpFacilitatorClient, type CdpFacilitatorClientArgs } from "@coinbase/x402";
import { getCdpDefaultSchemes } from "@coinbase/x402/server";
import {
  paymentMiddlewareFromConfig,
  type PaywallConfig,
  type SchemeRegistration,
} from "@x402/hono";
import type { RoutesConfig } from "@x402/core/server";

export interface CdpHonoConfig extends CdpFacilitatorClientArgs {
  routes: RoutesConfig;
  schemes?: SchemeRegistration[];
  paywallConfig?: PaywallConfig;
}

export function createCdpHonoMiddleware(config: CdpHonoConfig) {
  const { routes, schemes, paywallConfig, ...facilitatorArgs } = config;
  const facilitator = createCdpFacilitatorClient(facilitatorArgs);
  const resolvedSchemes = schemes ?? (getCdpDefaultSchemes() as SchemeRegistration[]);
  return paymentMiddlewareFromConfig(routes, facilitator, resolvedSchemes, paywallConfig);
}

export { getCdpDefaultSchemes } from "@coinbase/x402/server";

export {
  paymentMiddlewareFromConfig,
  paymentMiddleware,
  paymentMiddlewareFromHTTPServer,
  x402ResourceServer,
  x402HTTPResourceServer,
  setSettlementOverrides,
  RouteConfigurationError,
  SETTLEMENT_OVERRIDES_HEADER,
} from "@x402/hono";
export type {
  PaywallConfig,
  PaywallProvider,
  SchemeRegistration,
  SettlementOverrides,
} from "@x402/hono";
export type { RoutesConfig } from "@x402/core/server";
