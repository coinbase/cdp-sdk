import Foundation
import HTTPTypes
import OpenAPIRuntime
import Testing

@testable import CDPSDK

@Suite("EvmClient Tests")
struct EvmClientTests {

    // MARK: - Test Helpers

    private func makeSUT(transport: MockTransport = MockTransport()) -> (
        EvmClient, MockTransport
    ) {
        let client = Client(
            serverURL: URL(string: "https://api.cdp.coinbase.com/platform")!,
            transport: transport,
            middlewares: []
        )
        return (EvmClient(client: client), transport)
    }

    private func accountJSON(address: String = "0xABC123", name: String? = "test-account") -> Data
    {
        if let name = name {
            return """
                {"address": "\(address)", "name": "\(name)"}
                """.data(using: .utf8)!
        }
        return """
            {"address": "\(address)"}
            """.data(using: .utf8)!
    }

    private func smartAccountJSON(
        address: String = "0xSMART", owners: [String] = ["0xOWNER1"]
    ) -> Data {
        let ownersStr = owners.map { "\"\($0)\"" }.joined(separator: ",")
        return """
            {"address": "\(address)", "owners": [\(ownersStr)]}
            """.data(using: .utf8)!
    }

    private func errorJSON(
        type: String = "invalid_request", message: String = "bad request",
        correlationId: String = "corr-123"
    ) -> Data {
        """
        {"errorType": "\(type)", "errorMessage": "\(message)", "correlationId": "\(correlationId)"}
        """.data(using: .utf8)!
    }

    // Valid ErrorType enum values from OpenAPI spec:
    // already_exists, not_found, invalid_request, internal_server_error, forbidden, etc.

    private func signatureJSON(signature: String = "0xSIG") -> Data {
        """
        {"signature": "\(signature)"}
        """.data(using: .utf8)!
    }

    private func signedTransactionJSON(signedTx: String = "0xSIGNEDTX") -> Data {
        """
        {"signedTransaction": "\(signedTx)"}
        """.data(using: .utf8)!
    }

    private func transactionResultJSON(hash: String = "0xHASH") -> Data {
        """
        {"transactionHash": "\(hash)"}
        """.data(using: .utf8)!
    }

    private func listAccountsJSON(
        accounts: [(address: String, name: String?)], nextPageToken: String? = nil
    ) -> Data {
        let accountsStr = accounts.map { acc -> String in
            if let name = acc.name {
                return "{\"address\": \"\(acc.address)\", \"name\": \"\(name)\"}"
            }
            return "{\"address\": \"\(acc.address)\"}"
        }.joined(separator: ",")

        let pageTokenStr =
            nextPageToken.map { "\"nextPageToken\": \"\($0)\"" } ?? "\"nextPageToken\": null"
        return """
            {"accounts": [\(accountsStr)], \(pageTokenStr)}
            """.data(using: .utf8)!
    }

    private func enqueueJSON(
        _ transport: MockTransport, statusCode: HTTPResponse.Status, body: Data
    ) {
        let response = HTTPResponse(
            status: statusCode,
            headerFields: HTTPFields([
                HTTPField(name: .contentType, value: "application/json")
            ])
        )
        transport.responses.append((response, HTTPBody(body)))
    }

    // MARK: - createAccount

    @Test("createAccount returns account on 201")
    func testCreateAccountSuccess() async throws {
        let transport = MockTransport()
        enqueueJSON(transport, statusCode: .created, body: accountJSON())
        let (sut, _) = makeSUT(transport: transport)

        let account = try await sut.createAccount(options: .init(name: "test-account"))

        #expect(account.address == "0xABC123")
        #expect(account.name == "test-account")
        #expect(account.type == "evm-server")
    }

    @Test("createAccount throws CdpError.api on 400")
    func testCreateAccountBadRequest() async throws {
        let transport = MockTransport()
        enqueueJSON(transport, statusCode: .badRequest, body: errorJSON())
        let (sut, _) = makeSUT(transport: transport)

        await #expect(throws: CdpError.self) {
            try await sut.createAccount()
        }
    }

    @Test("createAccount throws CdpError.api on 409 conflict")
    func testCreateAccountConflict() async throws {
        let transport = MockTransport()
        enqueueJSON(
            transport, statusCode: .conflict,
            body: errorJSON(type: "already_exists", message: "already exists"))
        let (sut, _) = makeSUT(transport: transport)

        await #expect(throws: CdpError.self) {
            try await sut.createAccount(options: .init(name: "existing"))
        }
    }

    // MARK: - getAccount(address:)

    @Test("getAccount by address returns account on 200")
    func testGetAccountByAddress() async throws {
        let transport = MockTransport()
        enqueueJSON(
            transport, statusCode: .ok,
            body: accountJSON(address: "0xFOO", name: "my-account"))
        let (sut, _) = makeSUT(transport: transport)

        let account = try await sut.getAccount(address: "0xFOO")

        #expect(account.address == "0xFOO")
        #expect(account.name == "my-account")
    }

    @Test("getAccount by address throws on 404")
    func testGetAccountByAddressNotFound() async throws {
        let transport = MockTransport()
        enqueueJSON(
            transport, statusCode: .notFound,
            body: errorJSON(type: "not_found", message: "account not found"))
        let (sut, _) = makeSUT(transport: transport)

        do {
            _ = try await sut.getAccount(address: "0xMISSING")
            Issue.record("Expected CdpError to be thrown")
        } catch let error as CdpError {
            guard case .api(let apiError) = error else {
                Issue.record("Expected .api error case")
                return
            }
            #expect(apiError.statusCode == 404)
            #expect(apiError.message == "account not found")
        }
    }

    // MARK: - getAccount(name:)

    @Test("getAccount by name returns account on 200")
    func testGetAccountByName() async throws {
        let transport = MockTransport()
        enqueueJSON(
            transport, statusCode: .ok,
            body: accountJSON(address: "0xBAR", name: "named-account"))
        let (sut, _) = makeSUT(transport: transport)

        let account = try await sut.getAccount(name: "named-account")

        #expect(account.address == "0xBAR")
        #expect(account.name == "named-account")
    }

    @Test("getAccount by name throws on 404")
    func testGetAccountByNameNotFound() async throws {
        let transport = MockTransport()
        enqueueJSON(
            transport, statusCode: .notFound,
            body: errorJSON(type: "not_found", message: "not found"))
        let (sut, _) = makeSUT(transport: transport)

        await #expect(throws: CdpError.self) {
            try await sut.getAccount(name: "nonexistent")
        }
    }

    // MARK: - getOrCreateAccount

    @Test("getOrCreateAccount returns existing account")
    func testGetOrCreateExisting() async throws {
        let transport = MockTransport()
        enqueueJSON(
            transport, statusCode: .ok,
            body: accountJSON(address: "0xEXIST", name: "my-acct"))
        let (sut, _) = makeSUT(transport: transport)

        let account = try await sut.getOrCreateAccount(name: "my-acct")

        #expect(account.address == "0xEXIST")
        #expect(transport.recordedRequests.count == 1)
    }

    @Test("getOrCreateAccount creates when not found")
    func testGetOrCreateNew() async throws {
        let transport = MockTransport()
        // First: get by name → 404
        enqueueJSON(
            transport, statusCode: .notFound,
            body: errorJSON(type: "not_found", message: "not found"))
        // Second: create → 201
        enqueueJSON(
            transport, statusCode: .created,
            body: accountJSON(address: "0xNEW", name: "new-acct"))
        let (sut, _) = makeSUT(transport: transport)

        let account = try await sut.getOrCreateAccount(name: "new-acct")

        #expect(account.address == "0xNEW")
        #expect(transport.recordedRequests.count == 2)
    }

    @Test("getOrCreateAccount handles 409 conflict with retry")
    func testGetOrCreateConflict() async throws {
        let transport = MockTransport()
        // First: get by name → 404
        enqueueJSON(
            transport, statusCode: .notFound,
            body: errorJSON(type: "not_found", message: "not found"))
        // Second: create → 409
        enqueueJSON(
            transport, statusCode: .conflict,
            body: errorJSON(type: "already_exists", message: "already exists"))
        // Third: retry get → 200
        enqueueJSON(
            transport, statusCode: .ok,
            body: accountJSON(address: "0xRACE", name: "race-acct"))
        let (sut, _) = makeSUT(transport: transport)

        let account = try await sut.getOrCreateAccount(name: "race-acct")

        #expect(account.address == "0xRACE")
        #expect(transport.recordedRequests.count == 3)
    }

    // MARK: - listAccounts

    @Test("listAccounts returns paginated results")
    func testListAccounts() async throws {
        let transport = MockTransport()
        enqueueJSON(
            transport, statusCode: .ok,
            body: listAccountsJSON(
                accounts: [("0xA", "acct-1"), ("0xB", "acct-2")],
                nextPageToken: "token-2"
            ))
        let (sut, _) = makeSUT(transport: transport)

        let result = try await sut.listAccounts(options: .init(pageSize: 2))

        #expect(result.accounts.count == 2)
        #expect(result.accounts[0].address == "0xA")
        #expect(result.accounts[1].address == "0xB")
        #expect(result.nextPageToken == "token-2")
    }

    // MARK: - signHash

    @Test("signHash returns signature")
    func testSignHash() async throws {
        let transport = MockTransport()
        enqueueJSON(transport, statusCode: .ok, body: signatureJSON(signature: "0xABCDEF"))
        let (sut, _) = makeSUT(transport: transport)

        let result = try await sut.signHash(
            options: .init(address: "0xACCT", hash: "0xHASHHASH"))

        #expect(result.signature == "0xABCDEF")
    }

    // MARK: - signMessage

    @Test("signMessage returns signature")
    func testSignMessage() async throws {
        let transport = MockTransport()
        enqueueJSON(transport, statusCode: .ok, body: signatureJSON(signature: "0xMSGSIG"))
        let (sut, _) = makeSUT(transport: transport)

        let result = try await sut.signMessage(
            options: .init(address: "0xACCT", message: "hello"))

        #expect(result.signature == "0xMSGSIG")
    }

    // MARK: - signTransaction

    @Test("signTransaction returns signed transaction")
    func testSignTransaction() async throws {
        let transport = MockTransport()
        enqueueJSON(
            transport, statusCode: .ok, body: signedTransactionJSON(signedTx: "0xSIGNEDRLP"))
        let (sut, _) = makeSUT(transport: transport)

        let result = try await sut.signTransaction(
            options: .init(address: "0xACCT", transaction: "0xRLP"))

        #expect(result.signature == "0xSIGNEDRLP")
    }

    // MARK: - sendTransaction

    @Test("sendTransaction with raw input returns hash")
    func testSendTransactionRaw() async throws {
        let transport = MockTransport()
        enqueueJSON(
            transport, statusCode: .ok, body: transactionResultJSON(hash: "0xTXHASH"))
        let (sut, _) = makeSUT(transport: transport)

        let result = try await sut.sendTransaction(
            options: .init(
                address: "0xACCT",
                transaction: .raw("0xRLPDATA"),
                network: "base-sepolia"
            ))

        #expect(result.transactionHash == "0xTXHASH")
    }

    @Test("sendTransaction with invalid network throws validation error")
    func testSendTransactionInvalidNetwork() async throws {
        let transport = MockTransport()
        let (sut, _) = makeSUT(transport: transport)

        do {
            _ = try await sut.sendTransaction(
                options: .init(
                    address: "0xACCT",
                    transaction: .raw("0xRLP"),
                    network: "invalid-network-xyz"
                ))
            Issue.record("Expected CdpError to be thrown")
        } catch let error as CdpError {
            guard case .validation = error else {
                Issue.record("Expected .validation error case, got: \(error)")
                return
            }
        }
    }

    // MARK: - Smart Accounts

    @Test("createSmartAccount returns smart account on 201")
    func testCreateSmartAccount() async throws {
        let transport = MockTransport()
        enqueueJSON(
            transport, statusCode: .created,
            body: smartAccountJSON(address: "0xSM", owners: ["0xOWNER"]))
        let (sut, _) = makeSUT(transport: transport)

        let account = try await sut.createSmartAccount(options: .init(owner: "0xOWNER"))

        #expect(account.address == "0xSM")
        #expect(account.owners == ["0xOWNER"])
        #expect(account.type == "evm-smart")
    }

    @Test("getSmartAccount returns smart account on 200")
    func testGetSmartAccount() async throws {
        let transport = MockTransport()
        enqueueJSON(
            transport, statusCode: .ok,
            body: smartAccountJSON(address: "0xSM2", owners: ["0xO1", "0xO2"]))
        let (sut, _) = makeSUT(transport: transport)

        let account = try await sut.getSmartAccount(address: "0xSM2")

        #expect(account.address == "0xSM2")
        #expect(account.owners == ["0xO1", "0xO2"])
    }

    @Test("getSmartAccount throws on 404")
    func testGetSmartAccountNotFound() async throws {
        let transport = MockTransport()
        enqueueJSON(
            transport, statusCode: .notFound,
            body: errorJSON(type: "not_found", message: "smart account not found"))
        let (sut, _) = makeSUT(transport: transport)

        do {
            _ = try await sut.getSmartAccount(address: "0xMISSING")
            Issue.record("Expected CdpError to be thrown")
        } catch let error as CdpError {
            guard case .api(let apiError) = error else {
                Issue.record("Expected .api error case")
                return
            }
            #expect(apiError.statusCode == 404)
        }
    }

    // MARK: - requestFaucet

    @Test("requestFaucet returns transaction hash")
    func testRequestFaucet() async throws {
        let transport = MockTransport()
        enqueueJSON(
            transport, statusCode: .ok, body: transactionResultJSON(hash: "0xFAUCETHASH"))
        let (sut, _) = makeSUT(transport: transport)

        let result = try await sut.requestFaucet(
            options: .init(address: "0xACCT", network: "base-sepolia", token: "eth"))

        #expect(result.transactionHash == "0xFAUCETHASH")
    }

    @Test("requestFaucet with invalid token throws validation error")
    func testRequestFaucetInvalidToken() async throws {
        let transport = MockTransport()
        let (sut, _) = makeSUT(transport: transport)

        await #expect(throws: CdpError.self) {
            try await sut.requestFaucet(
                options: .init(address: "0xACCT", network: "base-sepolia", token: "invalid-token"))
        }
    }

    // MARK: - Error handling

    @Test("API error preserves correlation ID")
    func testErrorCorrelationId() async throws {
        let transport = MockTransport()
        enqueueJSON(
            transport, statusCode: .badRequest,
            body: errorJSON(
                type: "invalid_request",
                message: "invalid input",
                correlationId: "req-456"
            ))
        let (sut, _) = makeSUT(transport: transport)

        do {
            _ = try await sut.createAccount()
            Issue.record("Expected error")
        } catch let error as CdpError {
            guard case .api(let apiError) = error else {
                Issue.record("Expected .api case")
                return
            }
            #expect(apiError.statusCode == 400)
            #expect(apiError.errorType == "invalid_request")
            #expect(apiError.message == "invalid input")
            #expect(apiError.correlationId == "req-456")
        }
    }
}
