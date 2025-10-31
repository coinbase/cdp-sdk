package auth

import (
	"crypto/ecdsa"
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"math/big"
	"sort"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// GenerateJWT generates a JWT (Bearer token) for authenticating with Coinbase's APIs.
// Supports both EC (ES256) and Ed25519 (EdDSA) keys. Also supports JWTs meant for
// websocket connections by allowing RequestMethod, RequestHost, and RequestPath to all be
// empty strings, in which case the 'uris' claim is omitted from the JWT.
func GenerateJWT(options JwtOptions) (string, error) {
	// Validate required parameters
	if options.KeyID == "" {
		return "", errors.New("key name is required")
	}
	if options.KeySecret == "" {
		return "", errors.New("private key is required")
	}

	// Check if we have a REST API request or a websocket connection
	hasAllRequestParams := options.RequestMethod != "" && options.RequestHost != "" && options.RequestPath != ""
	hasNoRequestParams := options.RequestMethod == "" && options.RequestHost == "" && options.RequestPath == ""

	// Ensure we either have all request parameters or none (for websocket)
	if !hasAllRequestParams && !hasNoRequestParams {
		return "", errors.New("either all request details (method, host, path) must be provided, or all must be empty for JWTs intended for websocket connections")
	}

	// Set default expiration if not specified
	if options.ExpiresIn == 0 {
		options.ExpiresIn = 120
	}

	now := time.Now()

	// Generate URI for REST API requests
	var uri string
	if hasAllRequestParams {
		uri = fmt.Sprintf("%s %s%s", options.RequestMethod, options.RequestHost, options.RequestPath)
	}

	// Generate random nonce
	nonceBytes := make([]byte, 16)
	if _, err := rand.Read(nonceBytes); err != nil {
		return "", fmt.Errorf("failed to generate nonce: %w", err)
	}

	// Create common claims
	claims := jwt.MapClaims{
		"sub": options.KeyID,
		"iss": "cdp",
		"nbf": now.Unix(),
		"iat": now.Unix(),
		"exp": now.Add(time.Duration(options.ExpiresIn) * time.Second).Unix(),
	}

	// Use provided audience if available
	if len(options.Audience) > 0 {
		claims["aud"] = options.Audience
	}

	// Add the uris claim only for REST API requests, not for websocket connections
	if uri != "" {
		claims["uris"] = []string{uri}
	}

	// Create and sign JWT based on key type
	if isValidECKey(options.KeySecret) {
		return buildECJWT(options, claims, nonceBytes)
	} else if isValidEd25519Key(options.KeySecret) {
		return buildEdwardsJWT(options, claims, nonceBytes)
	}

	return "", errors.New("invalid key format - must be either PEM EC key or base64 Ed25519 key")
}

// GenerateWalletJWT generates a wallet authentication JWT for the given API endpoint URL.
func GenerateWalletJWT(options WalletJwtOptions) (string, error) {
	if options.WalletSecret == "" {
		return "", errors.New("wallet Secret is not defined")
	}

	uri := fmt.Sprintf("%s %s%s", options.RequestMethod, options.RequestHost, options.RequestPath)

	now := time.Now()

	// Decode the private key from base64
	privateKeyDER, err := base64.StdEncoding.DecodeString(options.WalletSecret)
	if err != nil {
		return "", fmt.Errorf("failed to decode wallet secret: %w", err)
	}

	// Parse the private key
	privateKey, err := x509.ParsePKCS8PrivateKey(privateKeyDER)
	if err != nil {
		return "", fmt.Errorf("could not create the EC key: %w", err)
	}

	ecdsaKey, ok := privateKey.(*ecdsa.PrivateKey)
	if !ok {
		return "", fmt.Errorf("private key is not an ECDSA key")
	}

	// Generate random nonce
	nonceBytes := make([]byte, 16)
	if _, err := rand.Read(nonceBytes); err != nil {
		return "", fmt.Errorf("failed to generate nonce: %w", err)
	}

	claims := WalletAuthClaims{
		URIs: []string{uri},
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			ID:        hex.EncodeToString(nonceBytes),
		},
	}

	// Hash the request data if present
	if len(options.RequestData) > 0 {
		// Sort the request data keys
		sortedData := sortKeys(options.RequestData)

		// Convert to JSON with sorted keys
		jsonBytes, err := json.Marshal(sortedData)
		if err != nil {
			return "", fmt.Errorf("failed to marshal request data: %w", err)
		}

		// Hash the JSON using SHA-256
		hash := sha256.Sum256(jsonBytes)
		claims.ReqHash = hex.EncodeToString(hash[:])
	}

	// Create the token
	token := jwt.NewWithClaims(jwt.SigningMethodES256, claims)
	token.Header["typ"] = "JWT"

	// Sign the token
	signedToken, err := token.SignedString(ecdsaKey)
	if err != nil {
		return "", fmt.Errorf("could not sign token: %w", err)
	}

	return signedToken, nil
}

// isValidEd25519Key checks if a string could be a valid Ed25519 key.
func isValidEd25519Key(str string) bool {
	decoded, err := base64.StdEncoding.DecodeString(str)
	if err != nil {
		return false
	}

	return len(decoded) == 64
}

// isValidECKey checks if a string is a valid EC private key in PEM format.
func isValidECKey(str string) bool {
	block, _ := pem.Decode([]byte(str))
	if block == nil {
		return false
	}

	key, err := x509.ParseECPrivateKey(block.Bytes)
	if err != nil {
		return false
	}

	return key != nil
}

// buildECJWT builds a JWT using an EC key.
func buildECJWT(options JwtOptions, claims jwt.MapClaims, nonce []byte) (string, error) {
	// Parse the private key
	block, _ := pem.Decode([]byte(options.KeySecret))
	if block == nil {
		return "", errors.New("failed to parse PEM block")
	}

	privateKey, err := x509.ParseECPrivateKey(block.Bytes)
	if err != nil {
		return "", fmt.Errorf("failed to parse EC private key: %w", err)
	}

	// Create the token
	token := jwt.NewWithClaims(jwt.SigningMethodES256, claims)
	token.Header["kid"] = options.KeyID
	token.Header["nonce"] = hex.EncodeToString(nonce)

	// Sign the token
	signedToken, err := token.SignedString(privateKey)
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	return signedToken, nil
}

// buildEdwardsJWT builds a JWT using an Ed25519 key.
func buildEdwardsJWT(options JwtOptions, claims jwt.MapClaims, nonce []byte) (string, error) {
	// Decode the base64 key
	decoded, err := base64.StdEncoding.DecodeString(options.KeySecret)
	if err != nil {
		return "", fmt.Errorf("failed to decode Ed25519 key: %w", err)
	}

	if len(decoded) != 64 {
		return "", errors.New("invalid Ed25519 key length")
	}

	// Extract private key
	privateKey := ed25519.PrivateKey(decoded)

	// Create the token
	token := jwt.NewWithClaims(jwt.SigningMethodEdDSA, claims)
	token.Header["kid"] = options.KeyID
	token.Header["nonce"] = hex.EncodeToString(nonce)

	// Sign the token
	signedToken, err := token.SignedString(privateKey)
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	return signedToken, nil
}

// sortKeys recursively sorts all keys in a map or slice of maps.
// It also handles special numeric types like *big.Int and *big.Float by converting them to strings.
func sortKeys(data interface{}) interface{} {
	switch v := data.(type) {
	case map[string]interface{}:
		// Create a new map with sorted keys
		sortedMap := make(map[string]interface{})
		keys := make([]string, 0, len(v))
		for k := range v {
			keys = append(keys, k)
		}
		sort.Strings(keys)

		// Recursively sort nested structures
		for _, k := range keys {
			sortedMap[k] = sortKeys(v[k])
		}
		return sortedMap

	case []interface{}:
		// Recursively sort elements in the slice
		sortedSlice := make([]interface{}, len(v))
		for i, elem := range v {
			sortedSlice[i] = sortKeys(elem)
		}
		return sortedSlice

	case *big.Int:
		// Convert *big.Int to string to ensure consistent JSON marshaling
		if v == nil {
			return nil
		}
		return v.String()

	case *big.Float:
		// Convert *big.Float to string to ensure consistent JSON marshaling
		if v == nil {
			return nil
		}
		return v.String()

	default:
		// Return primitive types as-is
		return data
	}
}
