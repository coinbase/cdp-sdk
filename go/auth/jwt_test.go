package auth

import (
	"crypto/ecdsa"
	"crypto/ed25519"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"strings"
	"testing"

	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func generateTestECKey(t *testing.T) string {
	t.Helper()
	privateKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	require.NoError(t, err)

	keyBytes, err := x509.MarshalECPrivateKey(privateKey)
	require.NoError(t, err)

	pemBlock := &pem.Block{
		Type:  "EC PRIVATE KEY",
		Bytes: keyBytes,
	}

	return string(pem.EncodeToMemory(pemBlock))
}

func generateTestEd25519Key(t *testing.T) string {
	t.Helper()
	publicKey, privateKey, err := ed25519.GenerateKey(rand.Reader)
	require.NoError(t, err)

	// Combine private and public key into 64-byte format
	combined := append(privateKey.Seed(), publicKey...)

	return base64.StdEncoding.EncodeToString(combined)
}

func generateTestWalletAuthKey(t *testing.T) string {
	t.Helper()
	privateKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	require.NoError(t, err)

	// Convert ECDSA private key to PKCS8 format
	pkcs8Key, err := x509.MarshalPKCS8PrivateKey(privateKey)
	require.NoError(t, err)

	// Return base64 encoded DER
	return base64.StdEncoding.EncodeToString(pkcs8Key)
}

func TestGenerateJWT(t *testing.T) {
	ecKey := generateTestECKey(t)
	ed25519Key := generateTestEd25519Key(t)

	defaultOptions := JwtOptions{
		KeyID:         "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
		RequestMethod: "GET",
		RequestHost:   "api.cdp.coinbase.com",
		RequestPath:   "/platform/v1/wallets",
	}

	t.Run("generates valid JWT with EC key", func(t *testing.T) {
		options := defaultOptions
		options.KeySecret = ecKey

		token, err := GenerateJWT(options)
		require.NoError(t, err)
		assert.NotEmpty(t, token)
		assert.Equal(t, 2, strings.Count(token, "."))
	})

	t.Run("generates valid JWT with Ed25519 key", func(t *testing.T) {
		options := defaultOptions
		options.KeySecret = ed25519Key

		token, err := GenerateJWT(options)
		require.NoError(t, err)
		assert.NotEmpty(t, token)
		assert.Equal(t, 2, strings.Count(token, "."))
	})

	t.Run("includes correct claims", func(t *testing.T) {
		options := defaultOptions
		options.KeySecret = ecKey
		options.ExpiresIn = 300

		token, err := GenerateJWT(options)
		require.NoError(t, err)

		// Parse token without verification
		parsedToken, err := jwt.Parse(token, func(_ *jwt.Token) (interface{}, error) {
			return nil, jwt.ErrInvalidKeyType
		})
		require.Error(t, err) // Error is expected since we're not verifying

		claims, ok := parsedToken.Claims.(jwt.MapClaims)
		require.True(t, ok, "expected claims to be jwt.MapClaims")

		assert.Equal(t, "cdp", claims["iss"])
		assert.Equal(t, options.KeyID, claims["sub"])
		assert.Equal(t, []interface{}{"cdp_service"}, claims["aud"])

		expectedURI := options.RequestMethod + " " + options.RequestHost + options.RequestPath
		assert.Equal(t, []interface{}{expectedURI}, claims["uris"])

		expFloat, ok := claims["exp"].(float64)
		require.True(t, ok, "expected exp to be float64")
		exp := int64(expFloat)

		nbfFloat, ok := claims["nbf"].(float64)
		require.True(t, ok, "expected nbf to be float64")
		nbf := int64(nbfFloat)

		assert.Equal(t, int64(300), exp-nbf)
	})

	t.Run("generates valid JWT for WebSocket without URI", func(t *testing.T) {
		options := JwtOptions{
			KeyID:         "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
			KeySecret:     ecKey,
			RequestMethod: "", // Empty for WebSocket
			RequestHost:   "", // Empty for WebSocket
			RequestPath:   "", // Empty for WebSocket
			ExpiresIn:     300,
		}

		token, err := GenerateJWT(options)
		require.NoError(t, err)
		assert.NotEmpty(t, token)

		// Parse token without verification
		parsedToken, err := jwt.Parse(token, func(_ *jwt.Token) (interface{}, error) {
			return nil, jwt.ErrInvalidKeyType
		})
		require.Error(t, err) // Error is expected since we're not verifying

		claims, ok := parsedToken.Claims.(jwt.MapClaims)
		require.True(t, ok, "expected claims to be jwt.MapClaims")

		// Check standard claims are present
		assert.Equal(t, "cdp", claims["iss"])
		assert.Equal(t, options.KeyID, claims["sub"])
		assert.Equal(t, []interface{}{"cdp_service"}, claims["aud"])

		// Check uris claim is NOT present for WebSocket JWTs
		_, hasUris := claims["uris"]
		assert.False(t, hasUris, "uris claim should not be present for WebSocket JWTs")

		// Check expiry
		expFloat, ok := claims["exp"].(float64)
		require.True(t, ok, "expected exp to be float64")
		exp := int64(expFloat)

		nbfFloat, ok := claims["nbf"].(float64)
		require.True(t, ok, "expected nbf to be float64")
		nbf := int64(nbfFloat)

		assert.Equal(t, int64(300), exp-nbf)
	})

	t.Run("rejects mixed empty and non-empty request parameters", func(t *testing.T) {
		options := JwtOptions{
			KeyID:         "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
			KeySecret:     ecKey,
			RequestMethod: "GET",
			RequestHost:   "", // Empty
			RequestPath:   "/platform/v1/wallets",
		}

		_, err := GenerateJWT(options)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "either all request details")
	})

	t.Run("validates required parameters", func(t *testing.T) {
		options := defaultOptions
		options.KeySecret = ecKey
		options.KeyID = ""

		_, err := GenerateJWT(options)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "key name is required")
	})

	t.Run("handles invalid key formats", func(t *testing.T) {
		options := defaultOptions
		options.KeySecret = "invalid-key"

		_, err := GenerateJWT(options)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "invalid key format")
	})
}

func TestGenerateWalletJWT(t *testing.T) {
	walletAuthKey := generateTestWalletAuthKey(t)

	defaultOptions := WalletJwtOptions{
		WalletSecret:  walletAuthKey,
		RequestMethod: "GET",
		RequestHost:   "api.coinbase.com",
		RequestPath:   "/api/v3/brokerage/accounts",
		RequestData: map[string]interface{}{
			"wallet_id": "1234567890",
		},
	}

	t.Run("generates valid JWT with EC key", func(t *testing.T) {
		token, err := GenerateWalletJWT(defaultOptions)
		require.NoError(t, err)
		assert.NotEmpty(t, token)
		assert.Equal(t, 2, strings.Count(token, "."))
	})

	t.Run("includes correct claims in payload", func(t *testing.T) {
		token, err := GenerateWalletJWT(defaultOptions)
		require.NoError(t, err)

		// Parse token without verification
		parsedToken, err := jwt.Parse(token, func(_ *jwt.Token) (interface{}, error) {
			return nil, jwt.ErrInvalidKeyType
		})
		require.Error(t, err) // Error is expected since we're not verifying

		claims, ok := parsedToken.Claims.(jwt.MapClaims)
		require.True(t, ok, "expected claims to be jwt.MapClaims")

		expectedURI := defaultOptions.RequestMethod + " " + defaultOptions.RequestHost + defaultOptions.RequestPath
		assert.Equal(t, []interface{}{expectedURI}, claims["uris"])
		assert.Equal(t, defaultOptions.RequestData, claims["req"])

		// Verify presence of required claims
		assert.NotNil(t, claims["iat"])
		assert.NotNil(t, claims["nbf"])
		assert.NotNil(t, claims["jti"])
	})

	t.Run("throws error when Wallet Secret is missing", func(t *testing.T) {
		invalidOptions := defaultOptions
		invalidOptions.WalletSecret = ""

		_, err := GenerateWalletJWT(invalidOptions)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "wallet Secret is not defined")
	})

	t.Run("throws error for invalid Wallet Secret format", func(t *testing.T) {
		invalidOptions := defaultOptions
		invalidOptions.WalletSecret = "invalid-wallet-secret"

		_, err := GenerateWalletJWT(invalidOptions)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "failed to decode wallet secret")
	})

	t.Run("supports empty request data", func(t *testing.T) {
		options := defaultOptions
		options.RequestData = map[string]interface{}{}

		token, err := GenerateWalletJWT(options)
		require.NoError(t, err)

		parsedToken, err := jwt.Parse(token, func(_ *jwt.Token) (interface{}, error) {
			return nil, jwt.ErrInvalidKeyType
		})
		require.Error(t, err) // Error is expected since we're not verifying

		claims, ok := parsedToken.Claims.(jwt.MapClaims)
		require.True(t, ok, "expected claims to be jwt.MapClaims")

		_, hasReq := claims["req"]
		assert.False(t, hasReq, "req claim should not be present")
	})

	t.Run("uses correct algorithm and type", func(t *testing.T) {
		token, err := GenerateWalletJWT(defaultOptions)
		require.NoError(t, err)

		parts := strings.Split(token, ".")
		require.Equal(t, 3, len(parts))

		headerJSON, err := base64.RawURLEncoding.DecodeString(parts[0])
		require.NoError(t, err)

		var header map[string]interface{}
		err = json.Unmarshal(headerJSON, &header)
		require.NoError(t, err)

		assert.Equal(t, "ES256", header["alg"])
		assert.Equal(t, "JWT", header["typ"])
	})
}
