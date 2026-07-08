import type { EndpointMetadata } from "../fetcher/EndpointMetadata.js";
import type { AuthRequest } from "./AuthRequest.js";

/**
 * Per-request information made available to an `auth` callback so it can compute request-scoped
 * credentials (e.g. signed JWTs whose claims depend on the HTTP method or request body).
 */
export interface AuthRequestInfo {
    /** The HTTP method of the outgoing request (e.g. "POST"). */
    method: string;
    /** The (unserialized) request body, if any. */
    body?: unknown;
    /** Headers assembled for the outgoing request so far. */
    headers?: Record<string, string>;
}

export interface AuthProvider {
    getAuthRequest(arg?: {
        endpointMetadata?: EndpointMetadata;
        /** The client's constructor options (including any config-declared extra fields). */
        clientOptions?: Record<string, unknown>;
        /** Per-request information for request-scoped auth. */
        request?: AuthRequestInfo;
    }): Promise<AuthRequest>;
}

export function isAuthProvider(value: unknown): value is AuthProvider {
    return (
        typeof value === "object" &&
        value !== null &&
        "getAuthRequest" in value &&
        typeof value.getAuthRequest === "function"
    );
}
