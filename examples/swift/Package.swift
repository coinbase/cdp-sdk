// swift-tools-version: 5.9
import PackageDescription

let cdpSDK: Target.Dependency = .product(name: "CDPSDK", package: "cdp-sdk")

let package = Package(
    name: "CDPSDKExamples",
    platforms: [.macOS(.v13)],
    dependencies: [
        .package(path: "./cdp-sdk"),
    ],
    targets: [
        // EVM Account Examples
        .executableTarget(name: "EVMCreateAccount", dependencies: [cdpSDK]),
        .executableTarget(name: "EVMGetOrCreateAccount", dependencies: [cdpSDK]),
        .executableTarget(name: "EVMListAccounts", dependencies: [cdpSDK]),

        // EVM Signing Examples
        .executableTarget(name: "EVMSignMessage", dependencies: [cdpSDK]),
        .executableTarget(name: "EVMSignHash", dependencies: [cdpSDK]),
        .executableTarget(name: "EVMSignTransaction", dependencies: [cdpSDK]),

        // EVM Transaction Examples
        .executableTarget(name: "EVMSendTransaction", dependencies: [cdpSDK]),
        .executableTarget(name: "EVMRequestFaucet", dependencies: [cdpSDK]),

        // EVM Smart Account Examples
        .executableTarget(name: "EVMCreateSmartAccount", dependencies: [cdpSDK]),

        // Solana Account Examples
        .executableTarget(name: "SolanaCreateAccount", dependencies: [cdpSDK]),
        .executableTarget(name: "SolanaGetOrCreateAccount", dependencies: [cdpSDK]),
        .executableTarget(name: "SolanaListAccounts", dependencies: [cdpSDK]),

        // Solana Signing Examples
        .executableTarget(name: "SolanaSignMessage", dependencies: [cdpSDK]),
        .executableTarget(name: "SolanaSignTransaction", dependencies: [cdpSDK]),

        // Solana Transaction Examples
        .executableTarget(name: "SolanaSendTransaction", dependencies: [cdpSDK]),
        .executableTarget(name: "SolanaRequestFaucet", dependencies: [cdpSDK]),
    ]
)
