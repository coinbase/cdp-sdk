import { createCdpFacilitatorClient, type CdpFacilitatorClientArgs } from "@coinbase/cdp-sdk/x402";
import { getCdpDefaultSchemes } from "@coinbase/cdp-sdk/x402";
import { paymentProxyFromConfig, type PaywallConfig, type SchemeRegistration } from "@x402/next";
import type { RoutesConfig } from "@x402/core/server";

export interface CdpNextConfig extends CdpFacilitatorClientArgs {
  routes: RoutesConfig;
  schemes?: SchemeRegistration[];
  paywallConfig?: PaywallConfig;
}

export function createCdpPaymentProxy(config: CdpNextConfig) {
  const { routes, schemes, paywallConfig, ...facilitatorArgs } = config;
  const facilitator = createCdpFacilitatorClient(facilitatorArgs);
  const resolvedSchemes = schemes ?? (getCdpDefaultSchemes() as SchemeRegistration[]);
  return paymentProxyFromConfig(routes, facilitator, resolvedSchemes, paywallConfig);
}

export { getCdpDefaultSchemes } from "@coinbase/cdp-sdk/x402";

export {
  paymentProxyFromConfig,
  paymentProxy,
  paymentProxyFromHTTPServer,
  withX402,
  withX402FromHTTPServer,
  x402ResourceServer,
  x402HTTPResourceServer,
  RouteConfigurationError,
} from "@x402/next";
export type { RouteConfig, PaywallConfig, PaywallProvider, SchemeRegistration } from "@x402/next";
export type { RoutesConfig } from "@x402/core/server";
