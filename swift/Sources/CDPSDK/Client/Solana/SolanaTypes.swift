import Foundation

// MARK: - Account Types

/// A Solana server-managed account.
public struct SolanaAccount: Sendable, Equatable {
    /// The account's Solana address (base58).
    public let address: String

    /// The account's display name.
    public let name: String?

    /// Account type identifier.
    public var type: String { "solana-server" }
}

// MARK: - Operation Options

/// Options for creating a new Solana account.
public struct CreateSolanaAccountOptions: Sendable {
    /// Optional name for the account.
    public var name: String?

    /// Optional idempotency key.
    public var idempotencyKey: String?

    public init(name: String? = nil, idempotencyKey: String? = nil) {
        self.name = name
        self.idempotencyKey = idempotencyKey
    }
}

/// Options for listing Solana accounts.
public struct ListSolanaAccountsOptions: Sendable {
    /// Maximum number of accounts to return.
    public var pageSize: Int?

    /// Pagination token from a previous response.
    public var pageToken: String?

    public init(pageSize: Int? = nil, pageToken: String? = nil) {
        self.pageSize = pageSize
        self.pageToken = pageToken
    }
}

/// Options for signing a Solana message.
public struct SignSolanaMessageOptions: Sendable {
    /// The account address to sign with.
    public let address: String

    /// The message to sign (base64-encoded).
    public let message: String

    /// Optional idempotency key.
    public var idempotencyKey: String?

    public init(address: String, message: String, idempotencyKey: String? = nil) {
        self.address = address
        self.message = message
        self.idempotencyKey = idempotencyKey
    }
}

/// Options for signing a Solana transaction.
public struct SignSolanaTransactionOptions: Sendable {
    /// The account address to sign with.
    public let address: String

    /// The transaction to sign (base64-encoded).
    public let transaction: String

    /// Optional idempotency key.
    public var idempotencyKey: String?

    public init(address: String, transaction: String, idempotencyKey: String? = nil) {
        self.address = address
        self.transaction = transaction
        self.idempotencyKey = idempotencyKey
    }
}

/// Options for sending a Solana transaction.
public struct SendSolanaTransactionOptions: Sendable {
    /// The network to send on (e.g., "solana-mainnet", "solana-devnet").
    public let network: String

    /// The signed transaction (base64-encoded).
    public let transaction: String

    /// Optional idempotency key.
    public var idempotencyKey: String?

    public init(network: String, transaction: String, idempotencyKey: String? = nil) {
        self.network = network
        self.transaction = transaction
        self.idempotencyKey = idempotencyKey
    }
}

/// Options for requesting Solana faucet funds.
public struct RequestSolanaFaucetOptions: Sendable {
    /// The address to receive funds.
    public let address: String

    /// The network to request from.
    public let network: String

    /// The token to request (e.g., "sol").
    public let token: String

    /// Optional idempotency key.
    public var idempotencyKey: String?

    public init(address: String, network: String, token: String, idempotencyKey: String? = nil) {
        self.address = address
        self.network = network
        self.token = token
        self.idempotencyKey = idempotencyKey
    }
}

// MARK: - Result Types

/// Result of a Solana signature operation.
public struct SolanaSignatureResult: Sendable {
    /// The signature (base64-encoded).
    public let signature: String
}

/// Result of a Solana sign transaction operation.
public struct SolanaSignTransactionResult: Sendable {
    /// The signed transaction (base64-encoded).
    public let signedTransaction: String
}

/// Result of sending a Solana transaction.
public struct SolanaSendTransactionResult: Sendable {
    /// The transaction signature.
    public let signature: String
}

/// Result of listing Solana accounts.
public struct ListSolanaAccountsResult: Sendable {
    /// The accounts in this page.
    public let accounts: [SolanaAccount]

    /// Token for the next page, or nil if no more pages.
    public let nextPageToken: String?
}

/// Result of a Solana faucet request.
public struct SolanaFaucetResult: Sendable {
    /// The transaction signature of the faucet transfer.
    public let transactionSignature: String
}
