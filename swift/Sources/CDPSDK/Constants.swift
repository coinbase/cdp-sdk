import Foundation

/// SDK-wide constants.
enum Constants {
    /// Default CDP API base URL.
    static let defaultBaseURL = "https://api.cdp.coinbase.com/platform"

    /// Default JWT expiration in seconds.
    static let defaultTokenExpiry: TimeInterval = 120

    /// SDK version string.
    static let sdkVersion = "0.1.0"

    /// SDK language identifier.
    static let sdkLanguage = "swift"
}
