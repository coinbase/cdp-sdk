import Foundation

/// Configuration options for the CDP SDK client.
public struct CdpClientOptions: Sendable {
    /// The CDP API key ID. If nil, reads from `CDP_API_KEY_ID` environment variable.
    public var apiKeyId: String?

    /// The CDP API key secret. If nil, reads from `CDP_API_KEY_SECRET` environment variable.
    public var apiKeySecret: String?

    /// The CDP wallet secret. If nil, reads from `CDP_WALLET_SECRET` environment variable.
    /// Required for operations that create/modify accounts.
    public var walletSecret: String?

    /// Custom base URL for the CDP API. Defaults to `https://api.cdp.coinbase.com/platform`.
    public var basePath: String?

    public init(
        apiKeyId: String? = nil,
        apiKeySecret: String? = nil,
        walletSecret: String? = nil,
        basePath: String? = nil
    ) {
        self.apiKeyId = apiKeyId
        self.apiKeySecret = apiKeySecret
        self.walletSecret = walletSecret
        self.basePath = basePath
    }
}
