import Foundation
import HTTPTypes
import OpenAPIRuntime
import Testing

@testable import CDPSDK

@Suite("SolanaClient Tests")
struct SolanaClientTests {

    // MARK: - Test Helpers

    private func makeSUT(transport: MockTransport = MockTransport()) -> (
        SolanaClient, MockTransport
    ) {
        let client = Client(
            serverURL: URL(string: "https://api.cdp.coinbase.com/platform")!,
            transport: transport,
            middlewares: []
        )
        return (SolanaClient(client: client), transport)
    }

    private func accountJSON(address: String = "So1ABC", name: String? = "test-sol") -> Data {
        if let name = name {
            return """
                {"address": "\(address)", "name": "\(name)"}
                """.data(using: .utf8)!
        }
        return """
            {"address": "\(address)"}
            """.data(using: .utf8)!
    }

    private func errorJSON(
        type: String = "invalid_request", message: String = "bad request",
        correlationId: String = "corr-sol"
    ) -> Data {
        """
        {"errorType": "\(type)", "errorMessage": "\(message)", "correlationId": "\(correlationId)"}
        """.data(using: .utf8)!
    }

    private func signatureJSON(signature: String = "solSIG") -> Data {
        """
        {"signature": "\(signature)"}
        """.data(using: .utf8)!
    }

    private func signedTransactionJSON(signedTx: String = "solSIGNED") -> Data {
        """
        {"signedTransaction": "\(signedTx)"}
        """.data(using: .utf8)!
    }

    private func sendTransactionJSON(signature: String = "solTXSIG") -> Data {
        """
        {"transactionSignature": "\(signature)"}
        """.data(using: .utf8)!
    }

    private func faucetJSON(signature: String = "solFAUCET") -> Data {
        """
        {"transactionSignature": "\(signature)"}
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

        let account = try await sut.createAccount(options: .init(name: "test-sol"))

        #expect(account.address == "So1ABC")
        #expect(account.name == "test-sol")
        #expect(account.type == "solana-server")
    }

    @Test("createAccount throws on 400")
    func testCreateAccountBadRequest() async throws {
        let transport = MockTransport()
        enqueueJSON(transport, statusCode: .badRequest, body: errorJSON())
        let (sut, _) = makeSUT(transport: transport)

        await #expect(throws: CdpError.self) {
            try await sut.createAccount()
        }
    }

    @Test("createAccount throws on 409 conflict")
    func testCreateAccountConflict() async throws {
        let transport = MockTransport()
        enqueueJSON(
            transport, statusCode: .conflict,
            body: errorJSON(type: "already_exists", message: "exists"))
        let (sut, _) = makeSUT(transport: transport)

        await #expect(throws: CdpError.self) {
            try await sut.createAccount(options: .init(name: "dup"))
        }
    }

    // MARK: - getAccount(address:)

    @Test("getAccount by address returns account on 200")
    func testGetAccountByAddress() async throws {
        let transport = MockTransport()
        enqueueJSON(
            transport, statusCode: .ok,
            body: accountJSON(address: "SoAddr1", name: "sol-1"))
        let (sut, _) = makeSUT(transport: transport)

        let account = try await sut.getAccount(address: "SoAddr1")

        #expect(account.address == "SoAddr1")
        #expect(account.name == "sol-1")
    }

    @Test("getAccount by address throws on 404")
    func testGetAccountByAddressNotFound() async throws {
        let transport = MockTransport()
        enqueueJSON(
            transport, statusCode: .notFound,
            body: errorJSON(type: "not_found", message: "not found"))
        let (sut, _) = makeSUT(transport: transport)

        do {
            _ = try await sut.getAccount(address: "missing")
            Issue.record("Expected CdpError to be thrown")
        } catch let error as CdpError {
            guard case .api(let apiError) = error else {
                Issue.record("Expected .api error case")
                return
            }
            #expect(apiError.statusCode == 404)
        }
    }

    // MARK: - getAccount(name:)

    @Test("getAccount by name returns account on 200")
    func testGetAccountByName() async throws {
        let transport = MockTransport()
        enqueueJSON(
            transport, statusCode: .ok,
            body: accountJSON(address: "SoNamed", name: "named-sol"))
        let (sut, _) = makeSUT(transport: transport)

        let account = try await sut.getAccount(name: "named-sol")

        #expect(account.address == "SoNamed")
        #expect(account.name == "named-sol")
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
            body: accountJSON(address: "SoExist", name: "existing"))
        let (sut, _) = makeSUT(transport: transport)

        let account = try await sut.getOrCreateAccount(name: "existing")

        #expect(account.address == "SoExist")
        #expect(transport.recordedRequests.count == 1)
    }

    @Test("getOrCreateAccount creates when not found")
    func testGetOrCreateNew() async throws {
        let transport = MockTransport()
        // get → 404
        enqueueJSON(
            transport, statusCode: .notFound,
            body: errorJSON(type: "not_found", message: "not found"))
        // create → 201
        enqueueJSON(
            transport, statusCode: .created,
            body: accountJSON(address: "SoNew", name: "new-sol"))
        let (sut, _) = makeSUT(transport: transport)

        let account = try await sut.getOrCreateAccount(name: "new-sol")

        #expect(account.address == "SoNew")
        #expect(transport.recordedRequests.count == 2)
    }

    @Test("getOrCreateAccount handles 409 conflict with retry")
    func testGetOrCreateConflict() async throws {
        let transport = MockTransport()
        // get → 404
        enqueueJSON(
            transport, statusCode: .notFound,
            body: errorJSON(type: "not_found", message: "not found"))
        // create → 409
        enqueueJSON(
            transport, statusCode: .conflict,
            body: errorJSON(type: "already_exists", message: "exists"))
        // retry get → 200
        enqueueJSON(
            transport, statusCode: .ok,
            body: accountJSON(address: "SoRace", name: "race-sol"))
        let (sut, _) = makeSUT(transport: transport)

        let account = try await sut.getOrCreateAccount(name: "race-sol")

        #expect(account.address == "SoRace")
        #expect(transport.recordedRequests.count == 3)
    }

    // MARK: - listAccounts

    @Test("listAccounts returns paginated results")
    func testListAccounts() async throws {
        let transport = MockTransport()
        enqueueJSON(
            transport, statusCode: .ok,
            body: listAccountsJSON(
                accounts: [("SoA", "a1"), ("SoB", "a2")],
                nextPageToken: "next-page"
            ))
        let (sut, _) = makeSUT(transport: transport)

        let result = try await sut.listAccounts(options: .init(pageSize: 2))

        #expect(result.accounts.count == 2)
        #expect(result.accounts[0].address == "SoA")
        #expect(result.accounts[1].address == "SoB")
        #expect(result.nextPageToken == "next-page")
    }

    // MARK: - signMessage

    @Test("signMessage returns signature")
    func testSignMessage() async throws {
        let transport = MockTransport()
        enqueueJSON(transport, statusCode: .ok, body: signatureJSON(signature: "solMsgSig"))
        let (sut, _) = makeSUT(transport: transport)

        let result = try await sut.signMessage(
            options: .init(address: "SoAddr", message: "hello solana"))

        #expect(result.signature == "solMsgSig")
    }

    @Test("signMessage throws on 404")
    func testSignMessageNotFound() async throws {
        let transport = MockTransport()
        enqueueJSON(
            transport, statusCode: .notFound,
            body: errorJSON(type: "not_found", message: "account not found"))
        let (sut, _) = makeSUT(transport: transport)

        await #expect(throws: CdpError.self) {
            try await sut.signMessage(
                options: .init(address: "SoMissing", message: "hello"))
        }
    }

    // MARK: - signTransaction

    @Test("signTransaction returns signed transaction")
    func testSignTransaction() async throws {
        let transport = MockTransport()
        enqueueJSON(
            transport, statusCode: .ok, body: signedTransactionJSON(signedTx: "solSignedTx"))
        let (sut, _) = makeSUT(transport: transport)

        let result = try await sut.signTransaction(
            options: .init(address: "SoAddr", transaction: "base64tx"))

        #expect(result.signedTransaction == "solSignedTx")
    }

    // MARK: - sendTransaction

    @Test("sendTransaction returns signature")
    func testSendTransaction() async throws {
        let transport = MockTransport()
        enqueueJSON(
            transport, statusCode: .ok, body: sendTransactionJSON(signature: "solTxSent"))
        let (sut, _) = makeSUT(transport: transport)

        let result = try await sut.sendTransaction(
            options: .init(network: "solana-devnet", transaction: "signedTx"))

        #expect(result.signature == "solTxSent")
    }

    @Test("sendTransaction with invalid network throws validation error")
    func testSendTransactionInvalidNetwork() async throws {
        let transport = MockTransport()
        let (sut, _) = makeSUT(transport: transport)

        do {
            _ = try await sut.sendTransaction(
                options: .init(network: "invalid-network", transaction: "tx"))
            Issue.record("Expected CdpError to be thrown")
        } catch let error as CdpError {
            guard case .validation = error else {
                Issue.record("Expected .validation error case, got: \(error)")
                return
            }
        }
    }

    // MARK: - requestFaucet

    @Test("requestFaucet returns transaction signature")
    func testRequestFaucet() async throws {
        let transport = MockTransport()
        enqueueJSON(transport, statusCode: .ok, body: faucetJSON(signature: "solFaucetSig"))
        let (sut, _) = makeSUT(transport: transport)

        let result = try await sut.requestFaucet(
            options: .init(address: "SoAddr", network: "solana-devnet", token: "sol"))

        #expect(result.transactionSignature == "solFaucetSig")
    }

    @Test("requestFaucet with invalid token throws validation error")
    func testRequestFaucetInvalidToken() async throws {
        let transport = MockTransport()
        let (sut, _) = makeSUT(transport: transport)

        await #expect(throws: CdpError.self) {
            try await sut.requestFaucet(
                options: .init(address: "SoAddr", network: "solana-devnet", token: "invalid-token"))
        }
    }

    // MARK: - Error handling

    @Test("API error preserves all fields")
    func testErrorFields() async throws {
        let transport = MockTransport()
        enqueueJSON(
            transport, statusCode: .badRequest,
            body: errorJSON(
                type: "invalid_request",
                message: "bad input",
                correlationId: "sol-corr-789"
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
            #expect(apiError.message == "bad input")
            #expect(apiError.correlationId == "sol-corr-789")
        }
    }
}
