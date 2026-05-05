import Foundation
import OpenAPIRuntime
import OpenAPIURLSession

/// The main CDP SDK client.
///
/// Provides access to EVM and Solana blockchain operations through sub-clients.
///
/// ## Usage
///
/// ```swift
/// // Using environment variables (CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET)
/// let cdp = try CdpClient()
///
/// // Using explicit credentials
/// let cdp = try CdpClient(options: .init(
///     apiKeyId: "your-key-id",
///     apiKeySecret: "your-key-secret",
///     walletSecret: "your-wallet-secret"
/// ))
///
/// // Create an EVM account
/// let account = try await cdp.evm.createAccount()
///
/// // Create a Solana account
/// let solAccount = try await cdp.solana.createAccount()
/// ```
public final class CdpClient: Sendable {
    /// The EVM sub-client for Ethereum operations.
    public let evm: EvmClient

    /// The Solana sub-client for Solana operations.
    public let solana: SolanaClient

    /// Creates a new CDP client instance.
    ///
    /// Credentials are resolved in order:
    /// 1. Explicit values in `options`
    /// 2. Environment variables (`CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`, `CDP_WALLET_SECRET`)
    ///
    /// - Parameter options: Client configuration options.
    /// - Throws: `CdpError.configuration` if required credentials are missing.
    public init(options: CdpClientOptions = .init()) throws {
        // Resolve credentials
        let apiKeyId = options.apiKeyId
            ?? ProcessInfo.processInfo.environment["CDP_API_KEY_ID"]
        let apiKeySecret = options.apiKeySecret
            ?? ProcessInfo.processInfo.environment["CDP_API_KEY_SECRET"]
        let walletSecret = options.walletSecret
            ?? ProcessInfo.processInfo.environment["CDP_WALLET_SECRET"]

        guard let apiKeyId = apiKeyId, !apiKeyId.isEmpty else {
            throw CdpError.configuration(
                "Missing CDP API Key ID. Provide via CdpClientOptions or set CDP_API_KEY_ID environment variable."
            )
        }

        guard let apiKeySecret = apiKeySecret, !apiKeySecret.isEmpty else {
            throw CdpError.configuration(
                "Missing CDP API Key Secret. Provide via CdpClientOptions or set CDP_API_KEY_SECRET environment variable."
            )
        }

        // Build base URL
        let baseURLString = options.basePath
            ?? ProcessInfo.processInfo.environment["CDP_BASE_PATH"]
            ?? Constants.defaultBaseURL
        guard let baseURL = URL(string: baseURLString) else {
            throw CdpError.configuration("Invalid base URL: \(baseURLString)")
        }

        // Configure auth middleware
        let authMiddleware = CdpAuthMiddleware(
            apiKeyId: apiKeyId,
            apiKeySecret: apiKeySecret,
            walletSecret: walletSecret
        )

        // Create transport and generated client
        let transport = URLSessionTransport()
        let client = Client(
            serverURL: baseURL,
            configuration: .init(dateTranscoder: .iso8601WithFractionalSeconds),
            transport: transport,
            middlewares: [authMiddleware]
        )

        // Initialize sub-clients
        self.evm = EvmClient(client: client)
        self.solana = SolanaClient(client: client)
    }
}
