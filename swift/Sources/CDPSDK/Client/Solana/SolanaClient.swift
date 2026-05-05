import Foundation
import OpenAPIRuntime

/// Client for Solana account operations.
///
/// Provides methods for creating, managing, and signing with Solana accounts.
public struct SolanaClient: Sendable {
    private let underlyingClient: any APIProtocol

    init(client: any APIProtocol) {
        self.underlyingClient = client
    }

    // MARK: - Accounts

    /// Creates a new Solana server-managed account.
    ///
    /// - Parameter options: Configuration for the new account.
    /// - Returns: The newly created account.
    /// - Throws: `CdpError` if the operation fails.
    public func createAccount(options: CreateSolanaAccountOptions = .init()) async throws
        -> SolanaAccount
    {
        let response = try await underlyingClient.createSolanaAccount(
            .init(
                headers: .init(
                    X_hyphen_Wallet_hyphen_Auth: walletAuthPlaceholder,
                    X_hyphen_Idempotency_hyphen_Key: options.idempotencyKey
                ),
                body: .json(.init(
                    name: options.name
                ))
            ))

        switch response {
        case .created(let output):
            let account = try output.body.json
            return SolanaAccount(
                address: account.address,
                name: account.name
            )
        case .badRequest(let output):
            throw CdpError.api(makeAPIError(statusCode: 400, from: try output.body.json))
        case .conflict(let output):
            throw CdpError.api(makeAPIError(statusCode: 409, from: try output.body.json))
        case .internalServerError(let output):
            throw CdpError.api(makeAPIError(statusCode: 500, from: try output.body.json))
        case .undocumented(let statusCode, let payload):
            throw CdpError.api(await extractUndocumentedError(statusCode: statusCode, payload: payload))
        default:
            throw CdpError.api(APIError(statusCode: 0, message: "Unexpected response: \(response)"))
        }
    }

    /// Gets an existing Solana account by address.
    ///
    /// - Parameter address: The Solana address (base58).
    /// - Returns: The account.
    /// - Throws: `CdpError` if the account is not found.
    public func getAccount(address: String) async throws -> SolanaAccount {
        let response = try await underlyingClient.getSolanaAccount(
            .init(path: .init(address: address))
        )

        switch response {
        case .ok(let output):
            let account = try output.body.json
            return SolanaAccount(
                address: account.address,
                name: account.name
            )
        case .badRequest(let output):
            throw CdpError.api(makeAPIError(statusCode: 400, from: try output.body.json))
        case .notFound(let output):
            throw CdpError.api(makeAPIError(statusCode: 404, from: try output.body.json))
        case .internalServerError(let output):
            throw CdpError.api(makeAPIError(statusCode: 500, from: try output.body.json))
        case .undocumented(let statusCode, let payload):
            throw CdpError.api(await extractUndocumentedError(statusCode: statusCode, payload: payload))
        default:
            throw CdpError.api(APIError(statusCode: 0, message: "Unexpected response: \(response)"))
        }
    }

    /// Gets an existing Solana account by name.
    ///
    /// - Parameter name: The account name.
    /// - Returns: The account.
    /// - Throws: `CdpError` if the account is not found.
    public func getAccount(name: String) async throws -> SolanaAccount {
        let response = try await underlyingClient.getSolanaAccountByName(
            .init(path: .init(name: name))
        )

        switch response {
        case .ok(let output):
            let account = try output.body.json
            return SolanaAccount(
                address: account.address,
                name: account.name
            )
        case .badRequest(let output):
            throw CdpError.api(makeAPIError(statusCode: 400, from: try output.body.json))
        case .notFound(let output):
            throw CdpError.api(makeAPIError(statusCode: 404, from: try output.body.json))
        case .internalServerError(let output):
            throw CdpError.api(makeAPIError(statusCode: 500, from: try output.body.json))
        case .undocumented(let statusCode, let payload):
            throw CdpError.api(await extractUndocumentedError(statusCode: statusCode, payload: payload))
        default:
            throw CdpError.api(APIError(statusCode: 0, message: "Unexpected response: \(response)"))
        }
    }

    /// Gets or creates a Solana account by name.
    ///
    /// Attempts to get the account first. If not found (404), creates a new one.
    /// Handles race conditions (409 conflict) by retrying the get.
    ///
    /// - Parameter name: The name of the account to get or create.
    /// - Returns: The existing or newly created account.
    /// - Throws: `CdpError` if the operation fails.
    public func getOrCreateAccount(name: String) async throws -> SolanaAccount {
        try await getOrCreate(
            get: { try await self.getAccount(name: name) },
            create: { try await self.createAccount(options: .init(name: name)) }
        )
    }

    /// Lists Solana accounts with pagination.
    ///
    /// - Parameter options: Pagination options.
    /// - Returns: A page of accounts with an optional next page token.
    /// - Throws: `CdpError` if the operation fails.
    public func listAccounts(options: ListSolanaAccountsOptions = .init()) async throws
        -> ListSolanaAccountsResult
    {
        let response = try await underlyingClient.listSolanaAccounts(
            query: .init(
                pageSize: options.pageSize,
                pageToken: options.pageToken
            )
        )

        switch response {
        case .ok(let output):
            let result = try output.body.json
            let accounts = result.value1.accounts.map { account in
                SolanaAccount(
                    address: account.address,
                    name: account.name
                )
            }
            return ListSolanaAccountsResult(
                accounts: accounts,
                nextPageToken: result.value2.nextPageToken
            )
        case .internalServerError(let output):
            throw CdpError.api(makeAPIError(statusCode: 500, from: try output.body.json))
        case .undocumented(let statusCode, let payload):
            throw CdpError.api(await extractUndocumentedError(statusCode: statusCode, payload: payload))
        default:
            throw CdpError.api(APIError(statusCode: 0, message: "Unexpected response: \(response)"))
        }
    }

    // MARK: - Signing

    /// Signs a message with the specified Solana account.
    ///
    /// - Parameter options: The message and account to sign with.
    /// - Returns: The signature result.
    /// - Throws: `CdpError` if signing fails.
    public func signMessage(options: SignSolanaMessageOptions) async throws -> SolanaSignatureResult
    {
        let response = try await underlyingClient.signSolanaMessage(
            .init(
                path: .init(address: options.address),
                headers: .init(
                    X_hyphen_Wallet_hyphen_Auth: walletAuthPlaceholder,
                    X_hyphen_Idempotency_hyphen_Key: options.idempotencyKey
                ),
                body: .json(.init(message: options.message))
            ))

        switch response {
        case .ok(let output):
            let result = try output.body.json
            return SolanaSignatureResult(signature: result.signature)
        case .badRequest(let output):
            throw CdpError.api(makeAPIError(statusCode: 400, from: try output.body.json))
        case .notFound(let output):
            throw CdpError.api(makeAPIError(statusCode: 404, from: try output.body.json))
        case .internalServerError(let output):
            throw CdpError.api(makeAPIError(statusCode: 500, from: try output.body.json))
        case .undocumented(let statusCode, let payload):
            throw CdpError.api(await extractUndocumentedError(statusCode: statusCode, payload: payload))
        default:
            throw CdpError.api(APIError(statusCode: 0, message: "Unexpected response: \(response)"))
        }
    }

    /// Signs a transaction with the specified Solana account.
    ///
    /// - Parameter options: The transaction and account to sign with.
    /// - Returns: The signed transaction.
    /// - Throws: `CdpError` if signing fails.
    public func signTransaction(options: SignSolanaTransactionOptions) async throws
        -> SolanaSignTransactionResult
    {
        let response = try await underlyingClient.signSolanaTransaction(
            .init(
                path: .init(address: options.address),
                headers: .init(
                    X_hyphen_Wallet_hyphen_Auth: walletAuthPlaceholder,
                    X_hyphen_Idempotency_hyphen_Key: options.idempotencyKey
                ),
                body: .json(.init(transaction: options.transaction))
            ))

        switch response {
        case .ok(let output):
            let result = try output.body.json
            return SolanaSignTransactionResult(signedTransaction: result.signedTransaction)
        case .badRequest(let output):
            throw CdpError.api(makeAPIError(statusCode: 400, from: try output.body.json))
        case .notFound(let output):
            throw CdpError.api(makeAPIError(statusCode: 404, from: try output.body.json))
        case .internalServerError(let output):
            throw CdpError.api(makeAPIError(statusCode: 500, from: try output.body.json))
        case .undocumented(let statusCode, let payload):
            throw CdpError.api(await extractUndocumentedError(statusCode: statusCode, payload: payload))
        default:
            throw CdpError.api(APIError(statusCode: 0, message: "Unexpected response: \(response)"))
        }
    }

    // MARK: - Transactions

    /// Sends a signed Solana transaction.
    ///
    /// - Parameter options: The transaction and network details.
    /// - Returns: The transaction signature.
    /// - Throws: `CdpError` if sending fails.
    public func sendTransaction(options: SendSolanaTransactionOptions) async throws
        -> SolanaSendTransactionResult
    {
        guard
            let networkEnum = Operations.sendSolanaTransaction.Input.Body.jsonPayload
                .networkPayload(rawValue: options.network)
        else {
            throw CdpError.validation("Unsupported Solana network: \(options.network)")
        }

        let response = try await underlyingClient.sendSolanaTransaction(
            .init(
                headers: .init(
                    X_hyphen_Wallet_hyphen_Auth: walletAuthPlaceholder,
                    X_hyphen_Idempotency_hyphen_Key: options.idempotencyKey
                ),
                body: .json(.init(
                    network: networkEnum,
                    transaction: options.transaction
                ))
            ))

        switch response {
        case .ok(let output):
            let result = try output.body.json
            return SolanaSendTransactionResult(signature: result.transactionSignature)
        case .badRequest(let output):
            throw CdpError.api(makeAPIError(statusCode: 400, from: try output.body.json))
        case .notFound(let output):
            throw CdpError.api(makeAPIError(statusCode: 404, from: try output.body.json))
        case .internalServerError(let output):
            throw CdpError.api(makeAPIError(statusCode: 500, from: try output.body.json))
        case .undocumented(let statusCode, let payload):
            throw CdpError.api(await extractUndocumentedError(statusCode: statusCode, payload: payload))
        default:
            throw CdpError.api(APIError(statusCode: 0, message: "Unexpected response: \(response)"))
        }
    }

    // MARK: - Faucet

    /// Requests testnet funds from the Solana faucet.
    ///
    /// - Parameter options: The faucet request details.
    /// - Returns: The faucet result with transaction signature.
    /// - Throws: `CdpError` if the request fails.
    public func requestFaucet(options: RequestSolanaFaucetOptions) async throws -> SolanaFaucetResult
    {
        guard
            let tokenEnum = Operations.requestSolanaFaucet.Input.Body.jsonPayload.tokenPayload(
                rawValue: options.token)
        else {
            throw CdpError.validation("Unsupported Solana faucet token: \(options.token)")
        }

        let response = try await underlyingClient.requestSolanaFaucet(
            body: .json(.init(
                address: options.address,
                token: tokenEnum
            ))
        )

        switch response {
        case .ok(let output):
            let result = try output.body.json
            return SolanaFaucetResult(transactionSignature: result.transactionSignature)
        case .badRequest(let output):
            throw CdpError.api(makeAPIError(statusCode: 400, from: try output.body.json))
        case .internalServerError(let output):
            throw CdpError.api(makeAPIError(statusCode: 500, from: try output.body.json))
        case .undocumented(let statusCode, let payload):
            throw CdpError.api(await extractUndocumentedError(statusCode: statusCode, payload: payload))
        default:
            throw CdpError.api(APIError(statusCode: 0, message: "Unexpected response: \(response)"))
        }
    }

}
