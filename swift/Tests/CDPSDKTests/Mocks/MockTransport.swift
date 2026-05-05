import Foundation
import HTTPTypes
import OpenAPIRuntime

/// A mock transport for testing that records requests and returns canned responses.
final class MockTransport: ClientTransport, @unchecked Sendable {
    /// Recorded requests.
    var recordedRequests: [(request: HTTPRequest, body: HTTPBody?, baseURL: URL)] = []

    /// Canned responses to return in order.
    var responses: [(HTTPResponse, HTTPBody?)] = []

    /// Default response when no canned responses are available.
    var defaultResponse: (HTTPResponse, HTTPBody?) = (
        HTTPResponse(status: .internalServerError),
        nil
    )

    func send(
        _ request: HTTPRequest,
        body: HTTPBody?,
        baseURL: URL,
        operationID: String
    ) async throws -> (HTTPResponse, HTTPBody?) {
        recordedRequests.append((request: request, body: body, baseURL: baseURL))

        if !responses.isEmpty {
            return responses.removeFirst()
        }

        return defaultResponse
    }

    /// Adds a successful JSON response to the queue.
    func enqueueJSONResponse(statusCode: HTTPResponse.Status = .ok, body: Data) {
        let response = HTTPResponse(status: statusCode)
        let httpBody = HTTPBody(body)
        responses.append((response, httpBody))
    }

    /// Adds an error response to the queue.
    func enqueueErrorResponse(statusCode: HTTPResponse.Status, message: String = "Error") {
        let response = HTTPResponse(status: statusCode)
        let body = """
            {"error": "\(message)", "message": "\(message)"}
            """.data(using: .utf8)!
        responses.append((response, HTTPBody(body)))
    }
}
