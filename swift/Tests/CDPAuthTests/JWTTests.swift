import CDPAuth
import Foundation
import Testing

@Suite("JWT Generation Tests")
struct JWTTests {

    // A test EC P-256 private key in PEM format
    static let testECKey = """
        -----BEGIN EC PRIVATE KEY-----
        MHcCAQEEIEt4qyw7G81ez33oGWu/Coxkz8DrPC5tLMaV1Hx28OS8oAoGCCqGSM49
        AwEHoUQDQgAELKkGhad1ltfX1+UQFYybcfKT/h6XsY+TXxcEewnlTXzUWvuEBTh1
        5X6msSbR6OLpn3uwjB72XvYsrKc4dIfjUw==
        -----END EC PRIVATE KEY-----
        """

    @Test("Generate JWT with EC key produces valid structure")
    func testGenerateJwtWithECKey() throws {
        let jwt = try generateJwt(options: JwtOptions(
            apiKeyId: "test-key-id",
            apiKeySecret: JWTTests.testECKey,
            requestMethod: "GET",
            requestHost: "api.cdp.coinbase.com",
            requestPath: "/platform/v2/evm/accounts"
        ))

        // JWT should have 3 parts separated by dots
        let parts = jwt.split(separator: ".")
        #expect(parts.count == 3)

        // Decode header
        let headerData = base64URLDecode(String(parts[0]))
        let header = try JSONSerialization.jsonObject(with: headerData) as! [String: Any]
        #expect(header["alg"] as? String == "ES256")
        #expect(header["kid"] as? String == "test-key-id")
        #expect(header["typ"] as? String == "JWT")
        #expect(header["nonce"] != nil)

        // Decode claims
        let claimsData = base64URLDecode(String(parts[1]))
        let claims = try JSONSerialization.jsonObject(with: claimsData) as! [String: Any]
        #expect(claims["sub"] as? String == "test-key-id")
        #expect(claims["iss"] as? String == "cdp")
        #expect(claims["iat"] != nil)
        #expect(claims["nbf"] != nil)
        #expect(claims["exp"] != nil)

        // Check URIs
        let uris = claims["uris"] as? [String]
        #expect(uris?.first == "GET api.cdp.coinbase.com/platform/v2/evm/accounts")
    }

    @Test("Generate JWT with custom expiry")
    func testGenerateJwtCustomExpiry() throws {
        let jwt = try generateJwt(options: JwtOptions(
            apiKeyId: "test-key-id",
            apiKeySecret: JWTTests.testECKey,
            expiresIn: 60
        ))

        let parts = jwt.split(separator: ".")
        let claimsData = base64URLDecode(String(parts[1]))
        let claims = try JSONSerialization.jsonObject(with: claimsData) as! [String: Any]

        let iat = claims["iat"] as! Int
        let exp = claims["exp"] as! Int
        #expect(exp - iat == 60)
    }

    @Test("Generate JWT without URI claim when no request details")
    func testGenerateJwtNoUri() throws {
        let jwt = try generateJwt(options: JwtOptions(
            apiKeyId: "test-key-id",
            apiKeySecret: JWTTests.testECKey
        ))

        let parts = jwt.split(separator: ".")
        let claimsData = base64URLDecode(String(parts[1]))
        let claims = try JSONSerialization.jsonObject(with: claimsData) as! [String: Any]
        #expect(claims["uris"] == nil)
    }

    @Test("Generate JWT with invalid key throws error")
    func testGenerateJwtInvalidKey() {
        #expect(throws: AuthError.self) {
            _ = try generateJwt(options: JwtOptions(
                apiKeyId: "test-key-id",
                apiKeySecret: "not-a-valid-key"
            ))
        }
    }

    @Test("Generate Wallet JWT produces valid structure")
    func testGenerateWalletJwt() throws {
        // Use a test wallet secret - base64 DER P-256 key
        // For testing we use the PEM format as wallet secret since parseWalletSecret supports it
        let walletJwt = try generateWalletJwt(options: WalletJwtOptions(
            walletSecret: JWTTests.testECKey,
            requestMethod: "POST",
            requestHost: "api.cdp.coinbase.com",
            requestPath: "/platform/v2/evm/accounts",
            body: "{\"name\":\"test\"}".data(using: .utf8)
        ))

        let parts = walletJwt.split(separator: ".")
        #expect(parts.count == 3)

        // Decode header
        let headerData = base64URLDecode(String(parts[0]))
        let header = try JSONSerialization.jsonObject(with: headerData) as! [String: Any]
        #expect(header["alg"] as? String == "ES256")
        #expect(header["kid"] == nil)  // Wallet JWT has no kid

        // Decode claims
        let claimsData = base64URLDecode(String(parts[1]))
        let claims = try JSONSerialization.jsonObject(with: claimsData) as! [String: Any]
        #expect(claims["jti"] != nil)
        #expect(claims["uris"] != nil)
        #expect(claims["reqHash"] != nil)
        #expect(claims["iat"] != nil)
        #expect(claims["nbf"] != nil)
        // Wallet JWT has no exp, sub, or iss
        #expect(claims["exp"] == nil)
        #expect(claims["sub"] == nil)
        #expect(claims["iss"] == nil)
    }

    @Test("Generate Wallet JWT without body has no reqHash")
    func testGenerateWalletJwtNoBody() throws {
        let walletJwt = try generateWalletJwt(options: WalletJwtOptions(
            walletSecret: JWTTests.testECKey,
            requestMethod: "POST",
            requestHost: "api.cdp.coinbase.com",
            requestPath: "/platform/v2/evm/accounts",
            body: nil
        ))

        let parts = walletJwt.split(separator: ".")
        let claimsData = base64URLDecode(String(parts[1]))
        let claims = try JSONSerialization.jsonObject(with: claimsData) as! [String: Any]
        #expect(claims["reqHash"] == nil)
    }

    // MARK: - Helpers

    private func base64URLDecode(_ string: String) -> Data {
        var base64 = string
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")

        // Add padding
        let remainder = base64.count % 4
        if remainder > 0 {
            base64.append(String(repeating: "=", count: 4 - remainder))
        }

        return Data(base64Encoded: base64)!
    }
}
