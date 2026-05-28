// Package x402 provides a Coinbase CDP-authenticated x402 facilitator client
// and Bazaar discovery client.
//
// The facilitator client implements the verify, settle, and getSupported
// endpoints defined by the x402 payment protocol, authenticating each request
// with a short-lived CDP JWT generated via the CDP SDK.
package x402

// CdpFacilitatorURL is the default base URL for the CDP hosted x402 facilitator.
const CdpFacilitatorURL = "https://api.cdp.coinbase.com/platform/v2/x402"

// CdpAPIBaseURL is the base URL for the CDP API (without the x402 path prefix).
// Used by the generated openapi client which appends paths like /v2/x402/discovery/... itself.
const CdpAPIBaseURL = "https://api.cdp.coinbase.com/platform"

// CdpAPIHost is the CDP API hostname used when generating JWT tokens.
const CdpAPIHost = "api.cdp.coinbase.com"

// Facilitator endpoint paths appended to the base URL.
const (
	FacilitatorVerifyPath    = "/verify"
	FacilitatorSettlePath    = "/settle"
	FacilitatorSupportedPath = "/supported"
)

// cdpSDKVersion is the version of this SDK, embedded in Correlation-Context headers.
const cdpSDKVersion = "0.0.1"

// CdpDefaultNetworks lists the networks supported by the CDP facilitator.
var CdpDefaultNetworks = []string{
	BaseMainnetCAIP2,
	BaseSepoliaCAIP2,
	PolygonCAIP2,
	ArbitrumCAIP2,
	WorldCAIP2,
	WorldSepoliaCAIP2,
	SolanaMainnetCAIP2,
	SolanaDevnetCAIP2,
}

// CAIP-2 network identifiers for CDP-supported chains.
const (
	BaseMainnetCAIP2   = "eip155:8453"
	BaseSepoliaCAIP2   = "eip155:84532"
	PolygonCAIP2       = "eip155:137"
	ArbitrumCAIP2      = "eip155:42161"
	WorldCAIP2         = "eip155:480"
	WorldSepoliaCAIP2  = "eip155:4801"
	SolanaMainnetCAIP2 = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
	SolanaDevnetCAIP2  = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1"
)

// Per-network USDC contract addresses, keyed by CAIP-2 network identifier.
const (
	USDCAddressBaseMainnet   = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
	USDCAddressBaseSepolia   = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
	USDCAddressPolygon       = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"
	USDCAddressArbitrum      = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
	USDCAddressWorld         = "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1"
	USDCAddressWorldSepolia  = "0x66145f38cBAC35Ca6F1Dfb4914dF98F1614aeA88"
	USDCAddressSolanaMainnet = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
	USDCAddressSolanaDevnet  = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
)

// CDPUSDCAddresses maps each CDP-supported CAIP-2 network identifier to its
// canonical USDC contract address (EVM) or mint address (Solana).
var CDPUSDCAddresses = map[string]string{
	BaseMainnetCAIP2:   USDCAddressBaseMainnet,
	BaseSepoliaCAIP2:   USDCAddressBaseSepolia,
	PolygonCAIP2:       USDCAddressPolygon,
	ArbitrumCAIP2:      USDCAddressArbitrum,
	WorldCAIP2:         USDCAddressWorld,
	WorldSepoliaCAIP2:  USDCAddressWorldSepolia,
	SolanaMainnetCAIP2: USDCAddressSolanaMainnet,
	SolanaDevnetCAIP2:  USDCAddressSolanaDevnet,
}
