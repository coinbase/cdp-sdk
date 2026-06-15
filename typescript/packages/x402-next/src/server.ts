import { AsyncLocalStorage } from "node:async_hooks";
import {
  createCdpFacilitatorClient,
  getCdpDefaultSchemes,
  type CdpFacilitatorClientArgs,
} from "@coinbase/cdp-sdk/x402";
import {
  withX402,
  type RouteConfig,
  type PaywallConfig,
  type SchemeRegistration,
  x402ResourceServer,
} from "@x402/next";
import { NextResponse, type NextRequest } from "next/server";

export interface CdpRouteHandlerConfig extends CdpFacilitatorClientArgs {
  routeConfig: RouteConfig;
  schemes?: SchemeRegistration[];
  paywallConfig?: PaywallConfig;
}

/**
 * App Router route-handler shape accepted by `createCdpRouteHandler`.
 *
 * Mirrors Next 15/16+ App Router handlers: takes a `NextRequest` and an
 * optional `context` argument (typically `{ params: Promise<...> }`), and
 * may return any `Response`/`NextResponse` (sync or async).
 */
export type CdpRouteHandler<T = unknown, Ctx = unknown> = (
  request: NextRequest,
  context: Ctx,
) => Response | NextResponse<T> | Promise<Response | NextResponse<T>>;

export function createCdpRouteHandler<T = unknown, Ctx = unknown>(
  routeHandler: CdpRouteHandler<T, Ctx>,
  config: CdpRouteHandlerConfig,
) {
  const { routeConfig, schemes, paywallConfig, ...facilitatorArgs } = config;
  const facilitator = createCdpFacilitatorClient(facilitatorArgs);
  const resolvedSchemes = schemes ?? (getCdpDefaultSchemes() as SchemeRegistration[]);
  const server = new x402ResourceServer(facilitator);
  for (const { network, server: schemeServer } of resolvedSchemes) {
    server.register(network, schemeServer);
  }

  // `withX402` only forwards the request to the inner handler. Preserve the
  // App Router `context` by storing it for the lifetime of each request.
  const contextStorage = new AsyncLocalStorage<Ctx>();

  const wrapped = withX402<T>(
    async (req: NextRequest) => {
      const ctx = contextStorage.getStore() as Ctx;
      const result = await routeHandler(req, ctx);
      if (result instanceof NextResponse) {
        return result as NextResponse<T>;
      }
      return new NextResponse<T>(result.body, {
        status: result.status,
        statusText: result.statusText,
        headers: result.headers,
      });
    },
    routeConfig,
    server,
    paywallConfig,
  );

  return (request: NextRequest, context: Ctx) =>
    contextStorage.run(context, () => wrapped(request));
}
