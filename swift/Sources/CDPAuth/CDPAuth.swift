// CDPAuth - Standalone authentication module for CDP API
//
// Provides JWT generation for API and Wallet authentication.
//
// Usage:
//   import CDPAuth
//
//   let jwt = try generateJwt(options: JwtOptions(
//       apiKeyId: "your-key-id",
//       apiKeySecret: "your-pem-or-ed25519-secret",
//       requestMethod: "GET",
//       requestHost: "api.cdp.coinbase.com",
//       requestPath: "/platform/v2/evm/accounts"
//   ))

// All public API is exported from:
// - JWT.swift: generateJwt(), generateWalletJwt()
// - JWTTypes.swift: JwtOptions, WalletJwtOptions
// - KeyParsing.swift: parseSigningKey(), SigningAlgorithm
// - Errors.swift: AuthError
