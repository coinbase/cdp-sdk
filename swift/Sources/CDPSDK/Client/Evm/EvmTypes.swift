import Foundation

// MARK: - Account Types

/// An EVM server-managed account.
public struct EvmServerAccount: Sendable, Equatable {
    /// The account's Ethereum address.
    public let address: String

    /// The account's display name.
    public let name: String?

    /// Account type identifier.
    public var type: String { "evm-server" }
}

/// An EVM smart contract account (Account Abstraction).
public struct EvmSmartAccount: Sendable, Equatable {
    /// The smart account's address.
    public let address: String

    /// Owner addresses.
    public let owners: [String]

    /// Account type identifier.
    public var type: String { "evm-smart" }
}

// MARK: - Operation Options

/// Options for creating a new EVM server account.
public struct CreateEvmAccountOptions: Sendable {
    /// Optional name for the account.
    public var name: String?

    /// Optional idempotency key.
    public var idempotencyKey: String?

    /// Optional policy ID to apply to the account.
    public var accountPolicy: String?

    public init(name: String? = nil, idempotencyKey: String? = nil, accountPolicy: String? = nil) {
        self.name = name
        self.idempotencyKey = idempotencyKey
        self.accountPolicy = accountPolicy
    }
}

/// Options for listing EVM accounts.
public struct ListEvmAccountsOptions: Sendable {
    /// Maximum number of accounts to return.
    public var pageSize: Int?

    /// Pagination token from a previous response.
    public var pageToken: String?

    public init(pageSize: Int? = nil, pageToken: String? = nil) {
        self.pageSize = pageSize
        self.pageToken = pageToken
    }
}

/// Options for creating a smart account.
public struct CreateEvmSmartAccountOptions: Sendable {
    /// Address of the owner account.
    public let owner: String

    /// Optional name for the smart account.
    public var name: String?

    /// Optional idempotency key.
    public var idempotencyKey: String?

    public init(owner: String, name: String? = nil, idempotencyKey: String? = nil) {
        self.owner = owner
        self.name = name
        self.idempotencyKey = idempotencyKey
    }
}

/// Options for signing a hash.
public struct SignHashOptions: Sendable {
    /// The account address to sign with.
    public let address: String

    /// The hash to sign (hex-encoded).
    public let hash: String

    /// Optional idempotency key.
    public var idempotencyKey: String?

    public init(address: String, hash: String, idempotencyKey: String? = nil) {
        self.address = address
        self.hash = hash
        self.idempotencyKey = idempotencyKey
    }
}

/// Options for signing a message.
public struct SignMessageOptions: Sendable {
    /// The account address to sign with.
    public let address: String

    /// The message to sign.
    public let message: String

    /// Optional idempotency key.
    public var idempotencyKey: String?

    public init(address: String, message: String, idempotencyKey: String? = nil) {
        self.address = address
        self.message = message
        self.idempotencyKey = idempotencyKey
    }
}

/// Options for signing a transaction.
public struct SignTransactionOptions: Sendable {
    /// The account address to sign with.
    public let address: String

    /// The RLP-encoded transaction.
    public let transaction: String

    /// Optional idempotency key.
    public var idempotencyKey: String?

    public init(address: String, transaction: String, idempotencyKey: String? = nil) {
        self.address = address
        self.transaction = transaction
        self.idempotencyKey = idempotencyKey
    }
}

/// Options for sending a transaction.
public struct SendEvmTransactionOptions: Sendable {
    /// The account address sending the transaction.
    public let address: String

    /// The transaction data (RLP-encoded string or transaction object fields).
    public let transaction: EvmTransactionInput

    /// The network to send on (e.g., "base-sepolia").
    public let network: String

    /// Optional idempotency key.
    public var idempotencyKey: String?

    public init(
        address: String, transaction: EvmTransactionInput, network: String,
        idempotencyKey: String? = nil
    ) {
        self.address = address
        self.transaction = transaction
        self.network = network
        self.idempotencyKey = idempotencyKey
    }
}

/// Transaction input — either a raw RLP-encoded string or structured fields.
public enum EvmTransactionInput: Sendable {
    /// RLP-encoded transaction hex string.
    case raw(String)

    /// Structured transaction fields.
    case fields(EvmTransactionFields)
}

/// Structured EVM transaction fields.
public struct EvmTransactionFields: Sendable {
    public let to: String
    public var value: String?
    public var data: String?
    public var nonce: Int?
    public var maxFeePerGas: String?
    public var maxPriorityFeePerGas: String?
    public var gas: String?

    public init(
        to: String, value: String? = nil, data: String? = nil,
        nonce: Int? = nil, maxFeePerGas: String? = nil,
        maxPriorityFeePerGas: String? = nil, gas: String? = nil
    ) {
        self.to = to
        self.value = value
        self.data = data
        self.nonce = nonce
        self.maxFeePerGas = maxFeePerGas
        self.maxPriorityFeePerGas = maxPriorityFeePerGas
        self.gas = gas
    }
}

/// Options for sending a user operation.
public struct SendUserOperationOptions: Sendable {
    /// The smart account address.
    public let smartAccountAddress: String

    /// The network to send on.
    public let network: String

    /// The calls to include in the user operation.
    public let calls: [EvmCall]

    /// Optional paymaster URL.
    public var paymasterUrl: String?

    /// Optional idempotency key.
    public var idempotencyKey: String?

    public init(
        smartAccountAddress: String, network: String, calls: [EvmCall],
        paymasterUrl: String? = nil, idempotencyKey: String? = nil
    ) {
        self.smartAccountAddress = smartAccountAddress
        self.network = network
        self.calls = calls
        self.paymasterUrl = paymasterUrl
        self.idempotencyKey = idempotencyKey
    }
}

/// A single EVM call within a user operation.
public struct EvmCall: Sendable {
    /// The target address.
    public let to: String

    /// The value to send (as a decimal string).
    public let value: String

    /// The calldata (hex-encoded).
    public let data: String

    public init(to: String, value: String = "0", data: String = "0x") {
        self.to = to
        self.value = value
        self.data = data
    }
}

/// Options for requesting faucet funds.
public struct RequestEvmFaucetOptions: Sendable {
    /// The address to receive funds.
    public let address: String

    /// The network to request from.
    public let network: String

    /// The token to request (e.g., "eth").
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

/// Result of a signature operation.
public struct EvmSignatureResult: Sendable {
    /// The signature (hex-encoded).
    public let signature: String
}

/// Result of a transaction send operation.
public struct EvmTransactionResult: Sendable {
    /// The transaction hash.
    public let transactionHash: String
}

/// Result of listing accounts.
public struct ListEvmAccountsResult: Sendable {
    /// The accounts in this page.
    public let accounts: [EvmServerAccount]

    /// Token for the next page, or nil if no more pages.
    public let nextPageToken: String?
}

/// Result of listing smart accounts.
public struct ListEvmSmartAccountsResult: Sendable {
    /// The smart accounts in this page.
    public let accounts: [EvmSmartAccount]

    /// Token for the next page, or nil if no more pages.
    public let nextPageToken: String?
}

/// Result of a user operation.
public struct UserOperationResult: Sendable {
    /// The user operation hash.
    public let userOpHash: String

    /// The status of the user operation.
    public let status: String
}

/// Result of a faucet request.
public struct EvmFaucetResult: Sendable {
    /// The transaction hash of the faucet transfer.
    public let transactionHash: String
}
