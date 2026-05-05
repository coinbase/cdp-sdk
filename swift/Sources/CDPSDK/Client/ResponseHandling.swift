import Foundation
import OpenAPIRuntime

// MARK: - Shared Constants

/// Placeholder value for X-Wallet-Auth header.
/// The actual JWT is injected by CdpAuthMiddleware at the HTTP transport level.
let walletAuthPlaceholder = "middleware-injected"

// MARK: - Error Helpers

/// Converts a generated `Components.Schemas._Error` into our public `APIError`.
func makeAPIError(statusCode: Int, from error: Components.Schemas._Error) -> APIError {
    APIError(
        statusCode: statusCode,
        errorType: error.errorType.rawValue,
        message: error.errorMessage,
        correlationId: error.correlationId,
        errorLink: error.errorLink?.value1
    )
}

/// Extracts an `APIError` from an undocumented (non-spec) response.
func extractUndocumentedError(statusCode: Int, payload: UndocumentedPayload) async -> APIError {
    guard let body = payload.body else {
        return APIError(statusCode: statusCode, message: "Unexpected response (no body)")
    }
    do {
        var data = Data()
        for try await chunk in body { data.append(contentsOf: chunk) }
        if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            let message =
                (json["message"] as? String) ?? (json["error"] as? String)
                ?? "Unknown error"
            return APIError(
                statusCode: statusCode,
                message: message,
                correlationId: json["correlation_id"] as? String
            )
        }
        let text = String(data: data, encoding: .utf8) ?? "Unknown error"
        return APIError(statusCode: statusCode, message: text)
    } catch {
        return APIError(statusCode: statusCode, message: "Unexpected response (body read failed)")
    }
}

// MARK: - Get-Or-Create Helper

/// Generic get-or-create pattern with 404→create and 409→retry-get.
///
/// 1. Tries `get()`
/// 2. If 404, tries `create()`
/// 3. If create returns 409 (conflict / already exists), retries `get()`
func getOrCreate<T>(
    get: () async throws -> T,
    create: () async throws -> T
) async throws -> T {
    do {
        return try await get()
    } catch let error as CdpError {
        guard case .api(let apiError) = error, apiError.statusCode == 404 else {
            throw error
        }
        do {
            return try await create()
        } catch let createError as CdpError {
            guard case .api(let createApiError) = createError,
                createApiError.statusCode == 409
            else {
                throw createError
            }
            return try await get()
        }
    }
}
