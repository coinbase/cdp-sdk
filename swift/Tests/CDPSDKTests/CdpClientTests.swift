import Foundation
import Testing

@testable import CDPSDK

@Suite("CdpClient Tests")
struct CdpClientTests {

    @Test("Client creation fails without credentials")
    func testClientCreationWithoutCredentials() {
        // Clear any env vars that might be set
        #expect(throws: CdpError.self) {
            _ = try CdpClient(options: .init(
                apiKeyId: nil,
                apiKeySecret: nil
            ))
        }
    }

    @Test("Client creation fails with empty API key ID")
    func testClientCreationEmptyKeyId() {
        #expect(throws: CdpError.self) {
            _ = try CdpClient(options: .init(
                apiKeyId: "",
                apiKeySecret: "some-secret"
            ))
        }
    }

    @Test("Client creation fails with empty API key secret")
    func testClientCreationEmptyKeySecret() {
        #expect(throws: CdpError.self) {
            _ = try CdpClient(options: .init(
                apiKeyId: "some-key-id",
                apiKeySecret: ""
            ))
        }
    }

    @Test("Client creation fails with invalid base URL")
    func testClientCreationInvalidBaseURL() {
        // Note: Most URL strings are valid in Foundation, so this tests an edge case
        #expect(throws: CdpError.self) {
            _ = try CdpClient(options: .init(
                apiKeyId: "test-key",
                apiKeySecret: """
                    -----BEGIN EC PRIVATE KEY-----
                    MHcCAQEEIEt4qyw7G81ez33oGWu/Coxkz8DrPC5tLMaV1Hx28OS8oAoGCCqGSM49
                    AwEHoUQDQgAELKkGhad1ltfX1+UQFYybcfKT/h6XsY+TXxcEewnlTXzUWvuEBTh1
                    5X6msSbR6OLpn3uwjB72XvYsrKc4dIfjUw==
                    -----END EC PRIVATE KEY-----
                    """,
                basePath: ""  // Empty string should be caught
            ))
        }
    }
}
