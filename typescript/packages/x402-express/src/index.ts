import { createCdpFacilitatorClient, type CdpFacilitatorClientArgs } from "@coinbase/cdp-sdk/x402";
import { getCdpDefaultSchemes } from "@coinbase/cdp-sdk/x402";
import {
  paymentMiddlewareFromConfig,
  type PaywallConfig,
  type SchemeRegistration,
} from "@x402/express";
import type { RoutesConfig } from "@x402/core/server";

export interface CdpExpressConfig extends CdpFacilitatorClientArgs {
  routes: RoutesConfig;
  schemes?: SchemeRegistration[];
  paywallConfig?: PaywallConfig;
}

export function createCdpExpressMiddleware(config: CdpExpressConfig) {
  const { routes, schemes, paywallConfig, ...facilitatorArgs } = config;
  const facilitator = createCdpFacilitatorClient(facilitatorArgs);
  const resolvedSchemes = schemes ?? (getCdpDefaultSchemes() as SchemeRegistration[]);
  return paymentMiddlewareFromConfig(routes, facilitator, resolvedSchemes, paywallConfig);
}

export { getCdpDefaultSchemes } from "@coinbase/cdp-sdk/x402";

export {
  paymentMiddlewareFromConfig,
  paymentMiddleware,
  paymentMiddlewareFromHTTPServer,
  x402ResourceServer,
  x402HTTPResourceServer,
  setSettlementOverrides,
  RouteConfigurationError,
  SETTLEMENT_OVERRIDES_HEADER,
} from "@x402/express";
export type {
  PaywallConfig,
  PaywallProvider,
  SchemeRegistration,
  SettlementOverrides,
} from "@x402/express";
export type { RoutesConfig } from "@x402/core/server";
