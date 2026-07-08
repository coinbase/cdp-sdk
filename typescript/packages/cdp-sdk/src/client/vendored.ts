import { CoinbaseApiClient } from "../_vendor/index.js";
import { CdpOpenApiClient } from "../openapi-client/index.js";

const DEFAULT_BASE_PATH = "https://api.cdp.coinbase.com/platform";

/**
 * Creates a `fetch`-compatible function that delegates HTTP requests to the
 * configured axios instance from the legacy OpenAPI client.
 *
 * While the SDK is mid-migration to the new generated client, this keeps
 * all HTTP requests consistent: auth headers (JWT + wallet auth), retries, and
 * error handling all flow through the battle-tested `withAuth` axios interceptor
 * wired up by `CdpOpenApiClient.configure()`.
 *
 * @returns {typeof fetch} A fetch implementation backed by the configured axios instance.
 */
export function createAxiosFetch(): typeof fetch {
  return (async (input: Request | string | URL, init?: RequestInit): Promise<Response> => {
    const axios = CdpOpenApiClient.getAxiosInstance();

    const fullUrl =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const method = (init?.method ?? "GET").toUpperCase();

    /*
     * The axios `withAuth` interceptor reconstructs the signed path as
     * `axiosClient.getUri() + axiosConfig.url`, so we must pass a relative URL
     * (with the configured base stripped) for correct JWT path signing.
     */
    const base = axios.getUri();
    let url = fullUrl.startsWith(base) ? fullUrl.slice(base.length) : fullUrl;
    if (!url.startsWith("/")) {
      url = "/" + url;
    }

    /*
     * The internal fetcher serializes the body to a JSON string. Parse it back to an
     * object so axios serialization, bigint conversion, and the wallet-JWT
     * request hash all match the legacy (tested) behavior.
     */
    let data: unknown = init?.body ?? undefined;
    if (typeof data === "string" && data.length > 0) {
      try {
        data = JSON.parse(data);
      } catch {
        // Leave non-JSON bodies untouched.
      }
    }

    const headers: Record<string, string> = init?.headers
      ? Object.fromEntries(new Headers(init.headers as HeadersInit))
      : {};

    const response = await axios.request({
      url,
      method,
      headers,
      data,
      // Preserve the raw response bytes so the internal fetcher's own parser handles them.
      responseType: "text",
      // Let the Fern fetcher own status-code handling instead of axios throwing.
      validateStatus: () => true,
    });

    const responseHeaders = new Headers();
    for (const [key, value] of Object.entries(response.headers ?? {})) {
      if (value != null) {
        responseHeaders.set(key, String(value));
      }
    }

    return new Response(response.data as string, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  }) as typeof fetch;
}

/**
 * Options for constructing a {@link VendoredClient}.
 */
export interface VendoredClientOptions {
  /** The API key ID. */
  apiKeyId: string;
  /** The API key secret. */
  apiKeySecret: string;
  /** The wallet secret. */
  walletSecret?: string;
  /** The host URL to connect to. */
  basePath?: string;
  /** Whether to enable debugging. */
  debugging?: boolean;
}

/**
 * Middleman client that maps the {@link CdpClient} construction convention onto
 * the generated `CoinbaseApiClient` configuration convention.
 *
 * It disables the generated client's built-in auth provider and instead routes
 * all HTTP through the legacy configured axios instance (see {@link createAxiosFetch}),
 * so the generated API resources are exposed without modifying any generated
 * code in `_vendor` and without breaking changes.
 */
export class VendoredClient extends CoinbaseApiClient {
  /**
   * Constructs a VendoredClient.
   *
   * @param {VendoredClientOptions} options - The configuration options.
   */
  constructor(options: VendoredClientOptions) {
    super({
      apiKeyId: options.apiKeyId,
      apiKeySecret: options.apiKeySecret,
      walletSecret: options.walletSecret,
      baseUrl: options.basePath ?? DEFAULT_BASE_PATH,
      /*
       * Disable the generated BearerAuthProvider; auth is injected by the axios
       * interceptor inside the custom fetch implementation below.
       */
      auth: false,
      fetch: createAxiosFetch(),
      // Retries are already handled by axios-retry in the legacy axios instance.
      maxRetries: 0,
      /*
       * `token` and `hook0Signature` are required by the generated type but are
       * unused at runtime when `auth` is `false`; the cast satisfies the type.
       */
    } as unknown as CoinbaseApiClient.Options);
  }
}
