import Foundation

/// Options for generating an API authentication JWT.
public struct JwtOptions: Sendable {
    /// The CDP API key ID.
    public let apiKeyId: String

    /// The CDP API key secret (PEM EC key or base64 Ed25519 key).
    public let apiKeySecret: String

    /// The HTTP request method (e.g., "GET", "POST").
    public var requestMethod: String?

    /// The request host (e.g., "api.cdp.coinbase.com").
    public var requestHost: String?

    /// The request path (e.g., "/platform/v2/evm/accounts").
    public var requestPath: String?

    /// Token expiration time in seconds. Defaults to 120.
    public var expiresIn: TimeInterval?

    /// Optional audience claim.
    public var audience: [String]?

    public init(
        apiKeyId: String,
        apiKeySecret: String,
        requestMethod: String? = nil,
        requestHost: String? = nil,
        requestPath: String? = nil,
        expiresIn: TimeInterval? = nil,
        audience: [String]? = nil
    ) {
        self.apiKeyId = apiKeyId
        self.apiKeySecret = apiKeySecret
        self.requestMethod = requestMethod
        self.requestHost = requestHost
        self.requestPath = requestPath
        self.expiresIn = expiresIn
        self.audience = audience
    }
}

/// Options for generating a Wallet authentication JWT.
public struct WalletJwtOptions: Sendable {
    /// The wallet secret (base64-encoded DER EC private key).
    public let walletSecret: String

    /// The HTTP request method.
    public let requestMethod: String

    /// The request host.
    public let requestHost: String

    /// The request path.
    public let requestPath: String

    /// The request body data (used for request hash computation).
    public let body: Data?

    public init(
        walletSecret: String,
        requestMethod: String,
        requestHost: String,
        requestPath: String,
        body: Data? = nil
    ) {
        self.walletSecret = walletSecret
        self.requestMethod = requestMethod
        self.requestHost = requestHost
        self.requestPath = requestPath
        self.body = body
    }
}

/// JWT header structure.
struct JWTHeader: Encodable, Sendable {
    let alg: String
    let kid: String?
    let typ: String
    let nonce: String?
}

/// API JWT claims.
struct APIClaims: Encodable, Sendable {
    let sub: String
    let iss: String
    let aud: [String]?
    let iat: Int
    let nbf: Int
    let exp: Int
    let uris: [String]?
}

/// Wallet JWT claims.
struct WalletClaims: Encodable, Sendable {
    let iat: Int
    let nbf: Int
    let jti: String
    let uris: [String]
    let reqHash: String?
}
