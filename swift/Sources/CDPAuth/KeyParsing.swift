import Foundation
import Crypto

/// Supported JWT signing algorithms.
public enum SigningAlgorithm: String, Sendable {
    case es256 = "ES256"
    case edDSA = "EdDSA"
}

/// Protocol for JWT signing implementations.
public protocol JWTSigner: Sendable {
    var algorithm: SigningAlgorithm { get }
    func sign(_ message: Data) throws -> Data
}

/// ECDSA P-256 (ES256) signer using CryptoKit.
public struct P256Signer: JWTSigner, Sendable {
    let privateKey: P256.Signing.PrivateKey
    public let algorithm: SigningAlgorithm = .es256

    /// Initialize from a PEM-encoded private key string.
    public init(pemKey: String) throws {
        do {
            self.privateKey = try P256.Signing.PrivateKey(pemRepresentation: pemKey)
        } catch {
            throw AuthError.keyImportFailed(
                "Failed to import EC PEM key: \(error.localizedDescription)"
            )
        }
    }

    /// Initialize from DER-encoded private key data.
    public init(derKey: Data) throws {
        do {
            self.privateKey = try P256.Signing.PrivateKey(derRepresentation: derKey)
        } catch {
            throw AuthError.keyImportFailed(
                "Failed to import EC DER key: \(error.localizedDescription)"
            )
        }
    }

    public func sign(_ message: Data) throws -> Data {
        let digest = SHA256.hash(data: message)
        let signature = try privateKey.signature(for: digest)
        // Return raw r||s representation (64 bytes) for JWS
        return signature.rawRepresentation
    }
}

/// Ed25519 (EdDSA) signer using CryptoKit.
public struct Ed25519Signer: JWTSigner, Sendable {
    let privateKey: Curve25519.Signing.PrivateKey
    public let algorithm: SigningAlgorithm = .edDSA

    /// Initialize from a base64-encoded 64-byte key (32-byte seed + 32-byte public key).
    public init(base64Key: String) throws {
        guard let decoded = Data(base64Encoded: base64Key) else {
            throw AuthError.keyImportFailed("Failed to decode base64 Ed25519 key")
        }

        guard decoded.count == 64 else {
            throw AuthError.keyImportFailed(
                "Ed25519 key must be 64 bytes (32 seed + 32 public), got \(decoded.count) bytes"
            )
        }

        // First 32 bytes are the seed (private key)
        let seed = decoded.prefix(32)
        do {
            self.privateKey = try Curve25519.Signing.PrivateKey(rawRepresentation: seed)
        } catch {
            throw AuthError.keyImportFailed(
                "Failed to import Ed25519 key from seed: \(error.localizedDescription)"
            )
        }
    }

    public func sign(_ message: Data) throws -> Data {
        // Ed25519 signs the raw message (no pre-hashing)
        return try privateKey.signature(for: message)
    }
}

/// Determines if a key string is a PEM-encoded EC private key.
public func isECPemKey(_ key: String) -> Bool {
    let trimmed = key.trimmingCharacters(in: .whitespacesAndNewlines)
    return (trimmed.contains("-----BEGIN EC PRIVATE KEY-----")
        || trimmed.contains("-----BEGIN PRIVATE KEY-----"))
        && (trimmed.contains("-----END EC PRIVATE KEY-----")
            || trimmed.contains("-----END PRIVATE KEY-----"))
}

/// Determines if a key string is a base64-encoded Ed25519 key (64 bytes).
public func isEd25519Key(_ key: String) -> Bool {
    guard let decoded = Data(base64Encoded: key) else { return false }
    return decoded.count == 64
}

/// Parses an API key secret and returns the appropriate signer.
///
/// Detects the key format:
/// - PEM format → ES256 (P-256 ECDSA)
/// - Base64 64-byte → EdDSA (Ed25519)
///
/// - Parameter secret: The API key secret string.
/// - Returns: A tuple of the signing algorithm and the signer.
/// - Throws: `AuthError.invalidAPIKeyFormat` if the key format is unrecognized.
public func parseSigningKey(_ secret: String) throws -> (SigningAlgorithm, any JWTSigner) {
    if isECPemKey(secret) {
        let signer = try P256Signer(pemKey: secret)
        return (.es256, signer)
    } else if isEd25519Key(secret) {
        let signer = try Ed25519Signer(base64Key: secret)
        return (.edDSA, signer)
    } else {
        throw AuthError.invalidAPIKeyFormat(
            "Key must be a PEM-encoded EC private key or a base64-encoded 64-byte Ed25519 key"
        )
    }
}
