import Foundation

/// Errors specific to CDP authentication operations.
public enum AuthError: Error, Sendable, CustomStringConvertible {
    /// The API key format is invalid.
    case invalidAPIKeyFormat(String)

    /// The wallet secret format is invalid.
    case invalidWalletSecretFormat(String)

    /// The wallet secret is required but was not provided.
    case missingWalletSecret

    /// JWT encoding failed.
    case encodingFailed(String)

    /// Key import failed.
    case keyImportFailed(String)

    public var description: String {
        switch self {
        case .invalidAPIKeyFormat(let detail):
            return "Invalid API key format: \(detail)"
        case .invalidWalletSecretFormat(let detail):
            return "Invalid wallet secret format: \(detail)"
        case .missingWalletSecret:
            return "Wallet secret is required for this operation"
        case .encodingFailed(let detail):
            return "JWT encoding failed: \(detail)"
        case .keyImportFailed(let detail):
            return "Key import failed: \(detail)"
        }
    }
}
