import HTTPTypes

extension HTTPField.Name {
    /// X-Idempotency-Key header.
    static let idempotencyKey = Self("X-Idempotency-Key")!

    /// X-Wallet-Auth header.
    static let walletAuth = Self("X-Wallet-Auth")!

    /// Correlation-Context header.
    static let correlationContext = Self("Correlation-Context")!
}
