import Foundation

/// Represents an error response from the CDP API.
public struct APIError: Error, Sendable {
    /// HTTP status code.
    public let statusCode: Int

    /// Error type identifier from the API.
    public let errorType: String

    /// Human-readable error message.
    public let message: String

    /// Correlation ID for debugging with CDP support.
    public let correlationId: String?

    /// Optional link to error documentation.
    public let errorLink: String?

    public init(
        statusCode: Int,
        errorType: String = "unknown",
        message: String,
        correlationId: String? = nil,
        errorLink: String? = nil
    ) {
        self.statusCode = statusCode
        self.errorType = errorType
        self.message = message
        self.correlationId = correlationId
        self.errorLink = errorLink
    }
}

extension APIError: CustomStringConvertible {
    public var description: String {
        var parts = ["[\(statusCode)] \(errorType): \(message)"]
        if let correlationId = correlationId {
            parts.append("correlation_id=\(correlationId)")
        }
        return parts.joined(separator: " ")
    }
}

extension APIError: LocalizedError {
    public var errorDescription: String? { description }
}

extension APIError: Equatable {
    public static func == (lhs: APIError, rhs: APIError) -> Bool {
        lhs.statusCode == rhs.statusCode
            && lhs.errorType == rhs.errorType
            && lhs.message == rhs.message
            && lhs.correlationId == rhs.correlationId
            && lhs.errorLink == rhs.errorLink
    }
}
