import CDPAuth
import Foundation
import HTTPTypes
import OpenAPIRuntime

/// Middleware that injects CDP authentication headers into every request.
///
/// Implements the two-layer auth scheme:
/// 1. `Authorization: Bearer <apiJwt>` — on all requests
/// 2. `X-Wallet-Auth: <walletJwt>` — on mutating requests to account/signing endpoints
struct CdpAuthMiddleware: ClientMiddleware, Sendable {
    let apiKeyId: String
    let apiKeySecret: String
    let walletSecret: String?
    let correlationContext: CorrelationContext

    init(
        apiKeyId: String,
        apiKeySecret: String,
        walletSecret: String?,
        source: String = "sdk",
        sourceVersion: String = Constants.sdkVersion
    ) {
        self.apiKeyId = apiKeyId
        self.apiKeySecret = apiKeySecret
        self.walletSecret = walletSecret
        self.correlationContext = CorrelationContext(
            sdkVersion: sourceVersion,
            source: source
        )
    }

    func intercept(
        _ request: HTTPRequest,
        body: HTTPBody?,
        baseURL: URL,
        operationID: String,
        next: @Sendable (HTTPRequest, HTTPBody?, URL) async throws -> (HTTPResponse, HTTPBody?)
    ) async throws -> (HTTPResponse, HTTPBody?) {
        var request = request

        let method = request.method.rawValue
        let host = baseURL.host ?? "api.cdp.coinbase.com"
        // Include the base URL's path prefix (e.g. "/platform") in the full request path
        let basePath = baseURL.path.hasSuffix("/")
            ? String(baseURL.path.dropLast())
            : baseURL.path
        let path = basePath + (request.path ?? "/")

        do {
            // Layer 1: API JWT (all requests)
            let apiJwt = try CDPAuth.generateJwt(
                options: JwtOptions(
                    apiKeyId: apiKeyId,
                    apiKeySecret: apiKeySecret,
                    requestMethod: method,
                    requestHost: host,
                    requestPath: path
                ))
            request.headerFields[.authorization] = "Bearer \(apiJwt)"

            // Layer 2: Wallet JWT (conditional — mutating requests to account endpoints)
            var bodyToSend = body
            if requiresWalletAuth(method: method, path: path) {
                guard let walletSecret = walletSecret else {
                    throw CdpError.authentication(
                        "Wallet secret is required for this operation but was not provided.")
                }

                // Buffer body for hashing
                let bodyData = try await collectBody(body)

                let walletJwt = try CDPAuth.generateWalletJwt(
                    options: WalletJwtOptions(
                        walletSecret: walletSecret,
                        requestMethod: method,
                        requestHost: host,
                        requestPath: path,
                        body: bodyData
                    ))

                request.headerFields[.walletAuth] = walletJwt

                // Re-create body from buffered data if needed
                if let bodyData = bodyData {
                    bodyToSend = HTTPBody(bodyData)
                }
            }

            // Correlation-Context header
            request.headerFields[.correlationContext] = correlationContext.headerValue

            return try await next(request, bodyToSend, baseURL)
        } catch let error as CdpError {
            throw error
        } catch let error as AuthError {
            throw CdpError.authentication(error.description)
        }
    }

    // MARK: - Private Helpers

    /// Determines if a request requires wallet authentication.
    private func requiresWalletAuth(method: String, path: String) -> Bool {
        let isMutating = method == "POST" || method == "DELETE" || method == "PUT"
        guard isMutating else { return false }

        let walletAuthPaths = [
            "/accounts",
            "/spend-permissions",
            "/user-operations/prepare-and-send",
            "/embedded-wallet-api/",
            "/end-users",
        ]

        return walletAuthPaths.contains { path.contains($0) }
    }

    /// Collects an HTTPBody into Data for hashing purposes.
    private func collectBody(_ body: HTTPBody?) async throws -> Data? {
        guard let body = body else { return nil }

        var data = Data()
        for try await chunk in body {
            data.append(contentsOf: chunk)
        }

        return data.isEmpty ? nil : data
    }
}
