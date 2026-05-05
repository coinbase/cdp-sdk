import Foundation

/// Builds the Correlation-Context header value for SDK telemetry.
struct CorrelationContext: Sendable {
    let sdkVersion: String
    let sdkLanguage: String
    let source: String

    init(
        sdkVersion: String = Constants.sdkVersion,
        sdkLanguage: String = Constants.sdkLanguage,
        source: String = "sdk"
    ) {
        self.sdkVersion = sdkVersion
        self.sdkLanguage = sdkLanguage
        self.source = source
    }

    /// Returns the formatted Correlation-Context header value.
    var headerValue: String {
        "sdk_version=\(sdkVersion),sdk_language=\(sdkLanguage),source=\(source)"
    }
}
