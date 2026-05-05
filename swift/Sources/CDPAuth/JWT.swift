import Foundation
import Crypto

// MARK: - Public API

/// Generates an API authentication JWT token.
///
/// The JWT is signed using the API key secret. The signing algorithm is automatically
/// detected from the key format:
/// - PEM EC private key → ES256
/// - Base64 64-byte key → EdDSA (Ed25519)
///
/// - Parameter options: JWT generation options including key credentials and request details.
/// - Returns: A signed JWT string.
/// - Throws: `AuthError` if key parsing or signing fails.
public func generateJwt(options: JwtOptions) throws -> String {
    let now = Int(Date().timeIntervalSince1970)
    let expiresIn = Int(options.expiresIn ?? 120)

    // Detect key type and create signer
    let (algorithm, signer) = try parseSigningKey(options.apiKeySecret)

    // Build header
    let nonce = generateNonce()
    let header = JWTHeader(
        alg: algorithm.rawValue,
        kid: options.apiKeyId,
        typ: "JWT",
        nonce: nonce
    )

    // Build URI claim
    var uris: [String]?
    if let method = options.requestMethod,
        let host = options.requestHost,
        let path = options.requestPath
    {
        uris = ["\(method) \(host)\(path)"]
    }

    // Build claims
    let claims = APIClaims(
        sub: options.apiKeyId,
        iss: "cdp",
        aud: options.audience,
        iat: now,
        nbf: now,
        exp: now + expiresIn,
        uris: uris
    )

    return try signJWT(header: header, claims: claims, signer: signer)
}

/// Generates a Wallet authentication JWT token.
///
/// The wallet JWT is always signed with ES256 using the wallet secret.
/// It includes a SHA-256 hash of the request body in the claims.
///
/// - Parameter options: Wallet JWT generation options.
/// - Returns: A signed JWT string.
/// - Throws: `AuthError` if key parsing or signing fails.
public func generateWalletJwt(options: WalletJwtOptions) throws -> String {
    let now = Int(Date().timeIntervalSince1970)

    // Build URI
    let uri = "\(options.requestMethod) \(options.requestHost)\(options.requestPath)"

    // Calculate request body hash
    var reqHash: String?
    if let body = options.body, !body.isEmpty {
        let sorted = sortJSONData(body)
        let hash = SHA256.hash(data: sorted)
        reqHash = hash.map { String(format: "%02x", $0) }.joined()
    }

    // Build header (wallet JWT has no kid or nonce)
    let header = JWTHeader(
        alg: "ES256",
        kid: nil,
        typ: "JWT",
        nonce: nil
    )

    // Build claims
    let claims = WalletClaims(
        iat: now,
        nbf: now,
        jti: generateNonce(),
        uris: [uri],
        reqHash: reqHash
    )

    // Parse wallet secret as EC key (always ES256)
    let signer = try parseWalletSecret(options.walletSecret)

    return try signJWT(header: header, claims: claims, signer: signer)
}

// MARK: - Internal Helpers

/// Signs a JWT with the given header, claims, and signer.
func signJWT<C: Encodable>(header: JWTHeader, claims: C, signer: any JWTSigner) throws -> String {
    let encoder = JSONEncoder()
    encoder.outputFormatting = .sortedKeys

    guard let headerData = try? encoder.encode(header) else {
        throw AuthError.encodingFailed("Failed to encode JWT header")
    }

    guard let claimsData = try? encoder.encode(claims) else {
        throw AuthError.encodingFailed("Failed to encode JWT claims")
    }

    let headerBase64 = base64URLEncode(headerData)
    let claimsBase64 = base64URLEncode(claimsData)

    let signingInput = "\(headerBase64).\(claimsBase64)"

    guard let signingInputData = signingInput.data(using: .utf8) else {
        throw AuthError.encodingFailed("Failed to encode signing input as UTF-8")
    }

    let signatureData = try signer.sign(signingInputData)
    let signatureBase64 = base64URLEncode(signatureData)

    return "\(headerBase64).\(claimsBase64).\(signatureBase64)"
}

/// Parses a wallet secret (base64 DER) into an ES256 signer.
func parseWalletSecret(_ secret: String) throws -> P256Signer {
    // Try base64 DER decode first
    if let derData = Data(base64Encoded: secret) {
        do {
            return try P256Signer(derKey: derData)
        } catch {
            // Fall through to PEM attempt
        }
    }

    // Try as PEM
    if isECPemKey(secret) {
        return try P256Signer(pemKey: secret)
    }

    // Try wrapping as PEM (base64 DER → PEM format)
    let pemWrapped = """
        -----BEGIN PRIVATE KEY-----
        \(secret)
        -----END PRIVATE KEY-----
        """
    do {
        return try P256Signer(pemKey: pemWrapped)
    } catch {
        throw AuthError.invalidWalletSecretFormat(
            "Wallet secret must be a base64-encoded DER EC private key or PEM EC private key"
        )
    }
}

/// Generates a random 32-character hex nonce.
func generateNonce() -> String {
    var bytes = [UInt8](repeating: 0, count: 16)
    _ = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
    return bytes.map { String(format: "%02x", $0) }.joined()
}

/// Base64URL encodes data (no padding).
func base64URLEncode(_ data: Data) -> String {
    data.base64EncodedString()
        .replacingOccurrences(of: "+", with: "-")
        .replacingOccurrences(of: "/", with: "_")
        .replacingOccurrences(of: "=", with: "")
}

/// Sorts JSON object keys for deterministic hashing.
/// If the data is not valid JSON or not an object, returns it unchanged.
func sortJSONData(_ data: Data) -> Data {
    guard let json = try? JSONSerialization.jsonObject(with: data, options: []) else {
        return data
    }

    guard
        let sorted = try? JSONSerialization.data(
            withJSONObject: json, options: [.sortedKeys, .withoutEscapingSlashes])
    else {
        return data
    }

    return sorted
}
