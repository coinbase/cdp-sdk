package auth

import (
	"crypto/ecdsa"
	"crypto/ed25519"
	"crypto/rand"
	"crypto/x509"
	"encoding/base64"
	"encoding/hex"
	"encoding/pem"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// GenerateJWT generates a JWT (Bearer token) for authenticating with Coinbase's REST APIs
// Supports both EC (ES256) and Ed25519 (EdDSA) keys.
func GenerateJWT(options JwtOptions) (string, error) {
	// Validate required parameters
	if options.KeyID == "" {
		return "", errors.New("key name is required")
	}
	if options.KeySecret == "" {
		return "", errors.New("private key is required")
	}
	if options.RequestMethod == "" || options.RequestHost == "" || options.RequestPath == "" {
		return "", errors.New("request details (method, host, path) are required")
	}

	// Set default expiration if not specified
	if options.ExpiresIn == 0 {
		options.ExpiresIn = 120
	}

	now := time.Now()
	uri := fmt.Sprintf("%s %s%s", options.RequestMethod, options.RequestHost, options.RequestPath)

	// Generate random nonce
	nonceBytes := make([]byte, 16)
	if _, err := rand.Read(nonceBytes); err != nil {
		return "", fmt.Errorf("failed to generate nonce: %w", err)
	}

	// Determine key type and build JWT accordingly
	if isValidECKey(options.KeySecret) {
		return buildECJWT(options, uri, now, nonceBytes)
	} else if isValidEd25519Key(options.KeySecret) {
		return buildEdwardsJWT(options, uri, now, nonceBytes)
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

	if len(options.RequestData) > 0 {
		claims.Req = options.RequestData
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
func buildECJWT(options JwtOptions, uri string, now time.Time, nonce []byte) (string, error) {
	// Parse the private key
	block, _ := pem.Decode([]byte(options.KeySecret))
	if block == nil {
		return "", errors.New("failed to parse PEM block")
	}

	privateKey, err := x509.ParseECPrivateKey(block.Bytes)
	if err != nil {
		return "", fmt.Errorf("failed to parse EC private key: %w", err)
	}

	// Create the claims
	claims := jwt.MapClaims{
		"sub":  options.KeyID,
		"iss":  "cdp",
		"aud":  []string{"cdp_service"},
		"uris": []string{uri},
		"nbf":  now.Unix(),
		"iat":  now.Unix(),
		"exp":  now.Add(time.Duration(options.ExpiresIn) * time.Second).Unix(),
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
func buildEdwardsJWT(options JwtOptions, uri string, now time.Time, nonce []byte) (string, error) {
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

	// Create the claims
	claims := jwt.MapClaims{
		"sub":  options.KeyID,
		"iss":  "cdp",
		"aud":  []string{"cdp_service"},
		"uris": []string{uri},
		"nbf":  now.Unix(),
		"iat":  now.Unix(),
		"exp":  now.Add(time.Duration(options.ExpiresIn) * time.Second).Unix(),
	}

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
