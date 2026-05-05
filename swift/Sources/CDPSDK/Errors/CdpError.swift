import Foundation

/// Top-level error type for CDP SDK operations.
public enum CdpError: Error, Sendable {
    /// Configuration error (missing credentials, invalid options).
    case configuration(String)

    /// Authentication error (key parsing, JWT signing).
    case authentication(String)

    /// API error returned by the CDP service.
    case api(APIError)

    /// Network/transport error.
    case network(message: String, retryable: Bool)

    /// User input validation error.
    case validation(String)

    /// Timeout waiting for an operation.
    case timeout(String)
}

extension CdpError: CustomStringConvertible {
    public var description: String {
        switch self {
        case .configuration(let msg):
            return "Configuration error: \(msg)"
        case .authentication(let msg):
            return "Authentication error: \(msg)"
        case .api(let error):
            return "API error (\(error.statusCode)): \(error.message)"
        case .network(let msg, _):
            return "Network error: \(msg)"
        case .validation(let msg):
            return "Validation error: \(msg)"
        case .timeout(let msg):
            return "Timeout: \(msg)"
        }
    }
}

extension CdpError: LocalizedError {
    public var errorDescription: String? { description }
}
