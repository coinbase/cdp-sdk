/**
 * Minimal shim for "next/server" used in e2e tests.
 *
 * next@16.x has no package-level exports map, so the bare specifier
 * "next/server" fails to resolve under Node.js strict-ESM when @x402/next
 * is loaded as a pre-compiled ESM module. This shim is aliased to "next/server"
 * via vitest's resolve.alias (applied to @x402/next via deps.inline) so the
 * import succeeds without a full Next.js runtime.
 *
 * Implements only the surface area @x402/next uses at runtime:
 *   - NextRequest.headers, method, url, nextUrl.{pathname,searchParams}
 *   - NextResponse constructor, static json(), next(), redirect()
 */

export class NextRequest extends Request {
  readonly nextUrl: URL;

  constructor(input: string | URL | Request, init?: RequestInit) {
    super(input, init);
    const raw = input instanceof Request ? input.url : input.toString();
    this.nextUrl = new URL(raw);
  }
}

export class NextResponse extends Response {
  static json<T = unknown>(data: T, init?: ResponseInit): NextResponse {
    const body = JSON.stringify(data);
    const headers = new Headers(init?.headers);
    if (!headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    return new NextResponse(body, { ...init, headers });
  }

  static next(_init?: ResponseInit): NextResponse {
    return new NextResponse(null, { status: 200 });
  }

  static redirect(url: string | URL, status = 307): NextResponse {
    return new NextResponse(null, {
      status,
      headers: { location: typeof url === "string" ? url : url.href },
    });
  }
}
