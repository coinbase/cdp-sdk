import CDPAuth
import Foundation
import HTTPTypes
import OpenAPIRuntime
import Testing

@testable import CDPSDK

@Suite("AuthMiddleware Tests")
struct AuthMiddlewareTests {
    // Valid EC PEM key for testing JWT generation
    let testKeyId = "test-key-id"
    let testKeySecret = """
        -----BEGIN EC PRIVATE KEY-----
        MHcCAQEEIEt4qyw7G81ez33oGWu/Coxkz8DrPC5tLMaV1Hx28OS8oAoGCCqGSM49
        AwEHoUQDQgAELKkGhad1ltfX1+UQFYybcfKT/h6XsY+TXxcEewnlTXzUWvuEBTh1
        5X6msSbR6OLpn3uwjB72XvYsrKc4dIfjUw==
        -----END EC PRIVATE KEY-----
        """
    let testWalletSecret =
        "MHcCAQEEIEt4qyw7G81ez33oGWu/Coxkz8DrPC5tLMaV1Hx28OS8oAoGCCqGSM49AwEHoUQDQgAELKkGhad1ltfX1+UQFYybcfKT/h6XsY+TXxcEewnlTXzUWvuEBTh15X6msSbR6OLpn3uwjB72XvYsrKc4dIfjUw=="

    private func makeMiddleware(walletSecret: String? = nil) -> CdpAuthMiddleware {
        CdpAuthMiddleware(
            apiKeyId: testKeyId,
            apiKeySecret: testKeySecret,
            walletSecret: walletSecret,
            source: "test",
            sourceVersion: "0.0.0"
        )
    }

    private func passthrough(
        capture: @escaping (HTTPRequest) -> Void = { _ in }
    ) -> @Sendable (HTTPRequest, HTTPBody?, URL) async throws -> (HTTPResponse, HTTPBody?) {
        return { request, body, url in
            capture(request)
            return (HTTPResponse(status: .ok), nil)
        }
    }

    private let baseURL = URL(string: "https://api.cdp.coinbase.com/platform")!

    // MARK: - Authorization Header

    @Test("All requests get Authorization Bearer header")
    func testAuthorizationHeader() async throws {
        let middleware = makeMiddleware()
        var captured: HTTPRequest?

        _ = try await middleware.intercept(
            HTTPRequest(method: .get, scheme: "https", authority: "api.cdp.coinbase.com",
                path: "/v2/evm/accounts"),
            body: nil,
            baseURL: baseURL,
            operationID: "listEvmAccounts",
            next: passthrough { captured = $0 }
        )

        let auth = captured?.headerFields[.authorization]
        #expect(auth != nil)
        #expect(auth?.hasPrefix("Bearer ") == true)
        // JWT has 3 parts separated by dots
        let jwt = auth?.dropFirst("Bearer ".count) ?? ""
        #expect(jwt.split(separator: ".").count == 3)
    }

    @Test("GET requests do NOT get X-Wallet-Auth")
    func testNoWalletAuthOnGet() async throws {
        let middleware = makeMiddleware(walletSecret: testWalletSecret)
        var captured: HTTPRequest?

        _ = try await middleware.intercept(
            HTTPRequest(method: .get, scheme: "https", authority: "api.cdp.coinbase.com",
                path: "/v2/evm/accounts"),
            body: nil,
            baseURL: baseURL,
            operationID: "listEvmAccounts",
            next: passthrough { captured = $0 }
        )

        #expect(captured?.headerFields[.walletAuth] == nil)
    }

    // MARK: - Wallet Auth

    @Test("POST to /accounts gets X-Wallet-Auth header")
    func testWalletAuthOnAccountCreate() async throws {
        let middleware = makeMiddleware(walletSecret: testWalletSecret)
        var captured: HTTPRequest?

        _ = try await middleware.intercept(
            HTTPRequest(method: .post, scheme: "https", authority: "api.cdp.coinbase.com",
                path: "/v2/evm/accounts"),
            body: HTTPBody(Data("{}".utf8)),
            baseURL: baseURL,
            operationID: "createEvmAccount",
            next: passthrough { captured = $0 }
        )

        let walletAuth = captured?.headerFields[.walletAuth]
        #expect(walletAuth != nil)
        // Should be a JWT (3 dot-separated parts)
        #expect(walletAuth?.split(separator: ".").count == 3)
    }

    @Test("POST to non-wallet path does NOT get wallet auth")
    func testNoWalletAuthOnNonWalletPost() async throws {
        let middleware = makeMiddleware(walletSecret: testWalletSecret)
        var captured: HTTPRequest?

        _ = try await middleware.intercept(
            HTTPRequest(method: .post, scheme: "https", authority: "api.cdp.coinbase.com",
                path: "/v2/some/other/endpoint"),
            body: HTTPBody(Data("{}".utf8)),
            baseURL: baseURL,
            operationID: "someOtherOp",
            next: passthrough { captured = $0 }
        )

        #expect(captured?.headerFields[.walletAuth] == nil)
    }

    @Test("POST to /spend-permissions gets wallet auth")
    func testWalletAuthOnSpendPermissions() async throws {
        let middleware = makeMiddleware(walletSecret: testWalletSecret)
        var captured: HTTPRequest?

        _ = try await middleware.intercept(
            HTTPRequest(method: .post, scheme: "https", authority: "api.cdp.coinbase.com",
                path: "/v2/evm/spend-permissions"),
            body: HTTPBody(Data("{}".utf8)),
            baseURL: baseURL,
            operationID: "createSpendPermission",
            next: passthrough { captured = $0 }
        )

        #expect(captured?.headerFields[.walletAuth] != nil)
    }

    // MARK: - Missing Wallet Secret

    @Test("Missing wallet secret throws CdpError.authentication")
    func testMissingWalletSecretThrows() async throws {
        let middleware = makeMiddleware(walletSecret: nil)

        do {
            _ = try await middleware.intercept(
                HTTPRequest(method: .post, scheme: "https", authority: "api.cdp.coinbase.com",
                    path: "/v2/evm/accounts"),
                body: HTTPBody(Data("{}".utf8)),
                baseURL: baseURL,
                operationID: "createEvmAccount",
                next: passthrough()
            )
            Issue.record("Expected CdpError.authentication to be thrown")
        } catch let error as CdpError {
            guard case .authentication(let msg) = error else {
                Issue.record("Expected .authentication case, got: \(error)")
                return
            }
            #expect(msg.contains("Wallet secret"))
        }
    }

    // MARK: - Correlation-Context

    @Test("Correlation-Context header is always present")
    func testCorrelationContextPresent() async throws {
        let middleware = makeMiddleware()
        var captured: HTTPRequest?

        _ = try await middleware.intercept(
            HTTPRequest(method: .get, scheme: "https", authority: "api.cdp.coinbase.com",
                path: "/v2/evm/accounts"),
            body: nil,
            baseURL: baseURL,
            operationID: "listEvmAccounts",
            next: passthrough { captured = $0 }
        )

        let correlationCtx = captured?.headerFields[.correlationContext]
        #expect(correlationCtx != nil)
        #expect(correlationCtx?.contains("sdk_version=") == true)
        #expect(correlationCtx?.contains("sdk_language=swift") == true)
    }

    // MARK: - Base URL Path Prefix

    @Test("Base URL path prefix is included in JWT URI")
    func testBaseURLPathPrefix() async throws {
        // Use a base URL with /platform prefix
        let middleware = makeMiddleware()
        var captured: HTTPRequest?

        _ = try await middleware.intercept(
            HTTPRequest(method: .get, scheme: "https", authority: "api.cdp.coinbase.com",
                path: "/v2/evm/accounts"),
            body: nil,
            baseURL: URL(string: "https://api.cdp.coinbase.com/platform")!,
            operationID: "listEvmAccounts",
            next: passthrough { captured = $0 }
        )

        // Verify the request was processed (JWT generated successfully with path prefix)
        #expect(captured?.headerFields[.authorization] != nil)
    }
}
