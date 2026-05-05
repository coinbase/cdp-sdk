import Foundation
import OpenAPIRuntime

/// Client for EVM (Ethereum Virtual Machine) account operations.
///
/// Provides methods for creating, managing, and signing with EVM accounts.
/// Supports both server-managed accounts and smart accounts (Account Abstraction).
public struct EvmClient: Sendable {
    private let underlyingClient: any APIProtocol

    init(client: any APIProtocol) {
        self.underlyingClient = client
    }

    // MARK: - Server Accounts

    /// Creates a new EVM server-managed account.
    ///
    /// - Parameter options: Configuration for the new account.
    /// - Returns: The newly created account.
    /// - Throws: `CdpError` if the operation fails.
    public func createAccount(options: CreateEvmAccountOptions = .init()) async throws
        -> EvmServerAccount
    {
        let response = try await underlyingClient.createEvmAccount(
            .init(
                headers: .init(
                    X_hyphen_Wallet_hyphen_Auth: walletAuthPlaceholder,
                    X_hyphen_Idempotency_hyphen_Key: options.idempotencyKey
                ),
                body: .json(.init(
                    name: options.name,
                    accountPolicy: options.accountPolicy
                ))
            ))

        switch response {
        case .created(let output):
            let account = try output.body.json
            return EvmServerAccount(
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

    /// Gets an existing EVM server account by address.
    ///
    /// - Parameter address: The Ethereum address of the account.
    /// - Returns: The account.
    /// - Throws: `CdpError` if the account is not found or the operation fails.
    public func getAccount(address: String) async throws -> EvmServerAccount {
        let response = try await underlyingClient.getEvmAccount(
            .init(path: .init(address: address))
        )

        switch response {
        case .ok(let output):
            let account = try output.body.json
            return EvmServerAccount(
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

    /// Gets an existing EVM server account by name.
    ///
    /// - Parameter name: The name of the account.
    /// - Returns: The account.
    /// - Throws: `CdpError` if the account is not found or the operation fails.
    public func getAccount(name: String) async throws -> EvmServerAccount {
        let response = try await underlyingClient.getEvmAccountByName(
            .init(path: .init(name: name))
        )

        switch response {
        case .ok(let output):
            let account = try output.body.json
            return EvmServerAccount(
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

    /// Gets or creates an EVM server account by name.
    ///
    /// Attempts to get the account first. If not found (404), creates a new one.
    /// Handles race conditions (409 conflict) by retrying the get.
    ///
    /// - Parameter name: The name of the account to get or create.
    /// - Returns: The existing or newly created account.
    /// - Throws: `CdpError` if the operation fails.
    public func getOrCreateAccount(name: String) async throws -> EvmServerAccount {
        try await getOrCreate(
            get: { try await self.getAccount(name: name) },
            create: { try await self.createAccount(options: .init(name: name)) }
        )
    }

    /// Lists EVM server accounts with pagination.
    ///
    /// - Parameter options: Pagination options.
    /// - Returns: A page of accounts with an optional next page token.
    /// - Throws: `CdpError` if the operation fails.
    public func listAccounts(options: ListEvmAccountsOptions = .init()) async throws
        -> ListEvmAccountsResult
    {
        let response = try await underlyingClient.listEvmAccounts(
            query: .init(
                pageSize: options.pageSize,
                pageToken: options.pageToken
            )
        )

        switch response {
        case .ok(let output):
            let result = try output.body.json
            let accounts = result.value1.accounts.map { account in
                EvmServerAccount(
                    address: account.address,
                    name: account.name
                )
            }
            return ListEvmAccountsResult(
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

    /// Signs a hash with the specified account.
    ///
    /// - Parameter options: The hash and account to sign with.
    /// - Returns: The signature result.
    /// - Throws: `CdpError` if signing fails.
    public func signHash(options: SignHashOptions) async throws -> EvmSignatureResult {
        let response = try await underlyingClient.signEvmHash(
            .init(
                path: .init(address: options.address),
                headers: .init(
                    X_hyphen_Wallet_hyphen_Auth: walletAuthPlaceholder,
                    X_hyphen_Idempotency_hyphen_Key: options.idempotencyKey
                ),
                body: .json(.init(hash: options.hash))
            ))

        switch response {
        case .ok(let output):
            let result = try output.body.json
            return EvmSignatureResult(signature: result.signature)
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

    /// Signs an EIP-191 message with the specified account.
    ///
    /// - Parameter options: The message and account to sign with.
    /// - Returns: The signature result.
    /// - Throws: `CdpError` if signing fails.
    public func signMessage(options: SignMessageOptions) async throws -> EvmSignatureResult {
        let response = try await underlyingClient.signEvmMessage(
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
            return EvmSignatureResult(signature: result.signature)
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

    /// Signs an EVM transaction with the specified account.
    ///
    /// - Parameter options: The transaction and account to sign with.
    /// - Returns: The signature result containing the signed transaction.
    /// - Throws: `CdpError` if signing fails.
    public func signTransaction(options: SignTransactionOptions) async throws -> EvmSignatureResult {
        let response = try await underlyingClient.signEvmTransaction(
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
            return EvmSignatureResult(signature: result.signedTransaction)
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

    /// Signs and sends an EVM transaction.
    ///
    /// Handles nonce management and gas estimation automatically.
    ///
    /// - Parameter options: The transaction details and network.
    /// - Returns: The transaction result with hash.
    /// - Throws: `CdpError` if sending fails.
    public func sendTransaction(options: SendEvmTransactionOptions) async throws
        -> EvmTransactionResult
    {
        let transactionStr: String
        switch options.transaction {
        case .raw(let rawTx):
            transactionStr = rawTx
        case .fields(let fields):
            transactionStr = encodeTransactionFields(fields)
        }

        guard
            let networkEnum = Operations.sendEvmTransaction.Input.Body.jsonPayload.networkPayload(
                rawValue: options.network)
        else {
            throw CdpError.validation("Unsupported network: \(options.network)")
        }

        let response = try await underlyingClient.sendEvmTransaction(
            .init(
                path: .init(address: options.address),
                headers: .init(
                    X_hyphen_Wallet_hyphen_Auth: walletAuthPlaceholder,
                    X_hyphen_Idempotency_hyphen_Key: options.idempotencyKey
                ),
                body: .json(.init(
                    network: networkEnum,
                    transaction: transactionStr
                ))
            ))

        switch response {
        case .ok(let output):
            let result = try output.body.json
            return EvmTransactionResult(transactionHash: result.transactionHash)
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

    // MARK: - Smart Accounts

    /// Creates a new EVM smart account.
    ///
    /// - Parameter options: Configuration including the owner address.
    /// - Returns: The newly created smart account.
    /// - Throws: `CdpError` if creation fails.
    public func createSmartAccount(options: CreateEvmSmartAccountOptions) async throws
        -> EvmSmartAccount
    {
        let response = try await underlyingClient.createEvmSmartAccount(
            .init(
                headers: .init(
                    X_hyphen_Idempotency_hyphen_Key: options.idempotencyKey
                ),
                body: .json(.init(
                    owners: [options.owner],
                    name: options.name
                ))
            ))

        switch response {
        case .created(let output):
            let account = try output.body.json
            return EvmSmartAccount(
                address: account.address,
                owners: account.owners
            )
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

    /// Gets an existing EVM smart account.
    ///
    /// - Parameter address: The smart account address.
    /// - Returns: The smart account.
    /// - Throws: `CdpError` if not found or the operation fails.
    public func getSmartAccount(address: String) async throws -> EvmSmartAccount {
        let response = try await underlyingClient.getEvmSmartAccount(
            .init(path: .init(address: address))
        )

        switch response {
        case .ok(let output):
            let account = try output.body.json
            return EvmSmartAccount(
                address: account.address,
                owners: account.owners
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

    /// Lists EVM smart accounts with pagination.
    ///
    /// - Parameter options: Pagination options.
    /// - Returns: A page of smart accounts.
    /// - Throws: `CdpError` if the operation fails.
    public func listSmartAccounts(options: ListEvmAccountsOptions = .init()) async throws
        -> ListEvmSmartAccountsResult
    {
        let response = try await underlyingClient.listEvmSmartAccounts(
            query: .init(
                pageSize: options.pageSize,
                pageToken: options.pageToken
            )
        )

        switch response {
        case .ok(let output):
            let result = try output.body.json
            let accounts = result.value1.accounts.map { account in
                EvmSmartAccount(
                    address: account.address,
                    owners: account.owners
                )
            }
            return ListEvmSmartAccountsResult(
                accounts: accounts,
                nextPageToken: result.value2.nextPageToken
            )
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

    // MARK: - Faucet

    /// Requests testnet funds from the EVM faucet.
    ///
    /// - Parameter options: The faucet request details.
    /// - Returns: The faucet result with transaction hash.
    /// - Throws: `CdpError` if the request fails.
    public func requestFaucet(options: RequestEvmFaucetOptions) async throws -> EvmFaucetResult {
        guard
            let networkEnum = Operations.requestEvmFaucet.Input.Body.jsonPayload.networkPayload(
                rawValue: options.network)
        else {
            throw CdpError.validation("Unsupported faucet network: \(options.network)")
        }

        guard
            let tokenEnum = Operations.requestEvmFaucet.Input.Body.jsonPayload.tokenPayload(
                rawValue: options.token)
        else {
            throw CdpError.validation("Unsupported faucet token: \(options.token)")
        }

        let response = try await underlyingClient.requestEvmFaucet(
            body: .json(.init(
                network: networkEnum,
                address: options.address,
                token: tokenEnum
            ))
        )

        switch response {
        case .ok(let output):
            let result = try output.body.json
            return EvmFaucetResult(transactionHash: result.transactionHash)
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

    // MARK: - Private Helpers

    private func encodeTransactionFields(_ fields: EvmTransactionFields) -> String {
        var dict: [String: Any] = ["to": fields.to]
        if let value = fields.value { dict["value"] = value }
        if let data = fields.data { dict["data"] = data }
        if let nonce = fields.nonce { dict["nonce"] = nonce }
        if let maxFeePerGas = fields.maxFeePerGas { dict["maxFeePerGas"] = maxFeePerGas }
        if let maxPriorityFeePerGas = fields.maxPriorityFeePerGas {
            dict["maxPriorityFeePerGas"] = maxPriorityFeePerGas
        }
        if let gas = fields.gas { dict["gas"] = gas }

        guard let data = try? JSONSerialization.data(withJSONObject: dict, options: [.sortedKeys]),
            let str = String(data: data, encoding: .utf8)
        else {
            return "{}"
        }
        return str
    }
}
