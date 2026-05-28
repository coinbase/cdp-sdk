module github.com/coinbase/cdp-sdk/go/x402/e2e

go 1.24.3

require (
	github.com/coinbase/cdp-sdk/go v0.0.0
	github.com/ethereum/go-ethereum v1.17.2
	github.com/x402-foundation/x402/go v0.0.0-20260501103002-01abe6cc6b19
)

require (
	github.com/ProjectZKM/Ziren/crates/go-runtime/zkvm_runtime v0.0.0-20251001021608-1fe7b43fc4d6 // indirect
	github.com/apapsch/go-jsonmerge/v2 v2.0.0 // indirect
	github.com/decred/dcrd/dcrec/secp256k1/v4 v4.0.1 // indirect
	github.com/golang-jwt/jwt/v5 v5.2.2 // indirect
	github.com/google/uuid v1.6.0 // indirect
	github.com/holiman/uint256 v1.3.2 // indirect
	github.com/oapi-codegen/runtime v1.4.0 // indirect
	golang.org/x/sys v0.40.0 // indirect
)

replace github.com/coinbase/cdp-sdk/go => ../../
