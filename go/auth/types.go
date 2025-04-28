package auth

import "github.com/golang-jwt/jwt/v5"

// JwtOptions contains configuration for JWT generation.
//
// This struct holds all necessary parameters for generating a JWT token
// for authenticating with Coinbase's REST APIs. It supports both EC (ES256)
// and Ed25519 (EdDSA) keys.
type JwtOptions struct {
	// KeyID is the API key ID
	//
	// Examples:
	//   'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
	//   'organizations/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/apiKeys/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
	KeyID string

	// KeySecret is the API key secret
	//
	// Examples:
	//   'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx==' (Edwards key (Ed25519))
	//   '-----BEGIN EC PRIVATE KEY-----\n...\n...\n...==\n-----END EC PRIVATE KEY-----\n' (EC key (ES256))
	KeySecret string

	// RequestMethod is the HTTP method for the request (e.g. 'GET', 'POST'), or empty string for JWTs intended for websocket connections
	RequestMethod string

	// RequestHost is the host for the request (e.g. 'api.cdp.coinbase.com'), or empty string for JWTs intended for websocket connections
	RequestHost string

	// RequestPath is the path for the request (e.g. '/platform/v1/wallets'), or empty string for JWTs intended for websocket connections
	RequestPath string

	// ExpiresIn is the optional expiration time in seconds (defaults to 120)
	ExpiresIn int64

	// Audience is the optional audience claim for the JWT
	Audience []string
}

// WalletJwtOptions represents the configuration options for generating the JWT.
type WalletJwtOptions struct {
	// WalletSecret is the wallet secret
	WalletSecret string

	// RequestMethod is the HTTP method for the request (e.g. 'GET', 'POST')
	RequestMethod string

	// RequestHost is the host for the request (e.g. 'api.cdp.coinbase.com')
	RequestHost string

	// RequestPath is the path for the request (e.g. '/platform/v2/evm/accounts')
	RequestPath string `json:"requestPath"`

	// RequestData is the data for the request (e.g. { "name": "My Account" })
	RequestData map[string]interface{} `json:"requestData"`
}

// WalletAuthClaims represents the JWT claims structure for wallet authentication.
type WalletAuthClaims struct {
	URIs []string               `json:"uris"`
	Req  map[string]interface{} `json:"req,omitempty"`
	jwt.RegisteredClaims
}
