package cdp

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"encoding/pem"
	"net/http"
	"regexp"
	"testing"

	"github.com/coinbase/cdp-sdk/go/openapi"
)

func generateTestECKeyForCdpTest(t *testing.T) string {
	t.Helper()
	privateKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatalf("failed to generate EC key: %v", err)
	}

	keyBytes, err := x509.MarshalECPrivateKey(privateKey)
	if err != nil {
		t.Fatalf("failed to marshal EC key: %v", err)
	}

	pemBlock := &pem.Block{
		Type:  "EC PRIVATE KEY",
		Bytes: keyBytes,
	}

	return string(pem.EncodeToMemory(pemBlock))
}

func TestRequiresWalletAuth(t *testing.T) {
	tests := map[string]struct {
		method string
		path   string
		want   bool
	}{
		// Method filtering
		"GET skipped": {
			method: "GET",
			path:   "/platform/v2/accounts",
			want:   false,
		},
		"PATCH skipped": {
			method: "PATCH",
			path:   "/platform/v2/accounts",
			want:   false,
		},

		// /accounts
		"POST /accounts": {
			method: "POST",
			path:   "/platform/v2/accounts",
			want:   true,
		},
		"DELETE /accounts/{id}": {
			method: "DELETE",
			path:   "/platform/v2/accounts/abc-123",
			want:   true,
		},
		"PUT /accounts/{id}": {
			method: "PUT",
			path:   "/platform/v2/accounts/abc-123",
			want:   true,
		},

		// /spend-permissions
		"POST /spend-permissions": {
			method: "POST",
			path:   "/platform/v2/spend-permissions",
			want:   true,
		},
		"DELETE /spend-permissions/{id}": {
			method: "DELETE",
			path:   "/platform/v2/spend-permissions/abc-123",
			want:   true,
		},

		// /user-operations/prepare-and-send
		"POST /user-operations/prepare-and-send": {
			method: "POST",
			path:   "/platform/v2/evm/accounts/0xabc/user-operations/prepare-and-send",
			want:   true,
		},

		// bare /prepare-and-send should NOT match
		"POST /prepare-and-send (bare) does not match": {
			method: "POST",
			path:   "/platform/v2/prepare-and-send",
			want:   false,
		},

		// /embedded-wallet-api/
		"POST /embedded-wallet-api/ route": {
			method: "POST",
			path:   "/platform/v2/embedded-wallet-api/end-users/uid-123/evm",
			want:   true,
		},
		"PUT /embedded-wallet-api/ route": {
			method: "PUT",
			path:   "/platform/v2/embedded-wallet-api/end-users/uid-123/wallet-secrets",
			want:   true,
		},
		"DELETE /embedded-wallet-api/ route": {
			method: "DELETE",
			path:   "/platform/v2/embedded-wallet-api/end-users/uid-123/address/0xabc/delegation",
			want:   true,
		},
		"GET /embedded-wallet-api/ skipped": {
			method: "GET",
			path:   "/platform/v2/embedded-wallet-api/end-users/uid-123",
			want:   false,
		},

		// /end-users (endsWith)
		"POST /v2/end-users": {
			method: "POST",
			path:   "/platform/v2/end-users",
			want:   true,
		},
		"GET /v2/end-users skipped": {
			method: "GET",
			path:   "/platform/v2/end-users",
			want:   false,
		},
		"POST /v2/end-users/{id} does not match endsWith": {
			method: "POST",
			path:   "/platform/v2/end-users/uid-123",
			want:   false,
		},

		// /end-users/import (endsWith)
		"POST /v2/end-users/import": {
			method: "POST",
			path:   "/platform/v2/end-users/import",
			want:   true,
		},

		// /end-users/{id}/evm (regex)
		"POST /v2/end-users/{id}/evm": {
			method: "POST",
			path:   "/platform/v2/end-users/uid-123/evm",
			want:   true,
		},
		"POST /v2/end-users/{id}/evm/sign does not match regex": {
			method: "POST",
			path:   "/platform/v2/end-users/uid-123/evm/sign",
			want:   false,
		},

		// /end-users/{id}/evm-smart-account (regex)
		"POST /v2/end-users/{id}/evm-smart-account": {
			method: "POST",
			path:   "/platform/v2/end-users/uid-123/evm-smart-account",
			want:   true,
		},

		// /end-users/{id}/solana (regex)
		"POST /v2/end-users/{id}/solana": {
			method: "POST",
			path:   "/platform/v2/end-users/uid-123/solana",
			want:   true,
		},
		"POST /v2/end-users/{id}/solana/sign does not match regex": {
			method: "POST",
			path:   "/platform/v2/end-users/uid-123/solana/sign",
			want:   false,
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			got := requiresWalletAuth(tc.method, tc.path)
			if got != tc.want {
				t.Errorf("requiresWalletAuth(%q, %q) = %v, want %v", tc.method, tc.path, got, tc.want)
			}
		})
	}
}

func TestApiKeyHeaderFnSkipsPublicOperationsWithoutCredentials(t *testing.T) {
	req, err := http.NewRequest(http.MethodGet, "https://api.cdp.coinbase.com/platform/v2/x402/discovery/search", nil)
	if err != nil {
		t.Fatalf("failed to build request: %v", err)
	}

	fn := apiKeyHeaderFn(ClientOptions{})
	if err := fn(context.Background(), req); err != nil {
		t.Fatalf("apiKeyHeaderFn returned an error for a public operation: %v", err)
	}

	if got := req.Header.Get("Authorization"); got != "" {
		t.Errorf("expected no Authorization header for a public operation, got %q", got)
	}
}

func TestApiKeyHeaderFnRequiresCredentialsForNonPublicOperations(t *testing.T) {
	req, err := http.NewRequest(http.MethodGet, "https://api.cdp.coinbase.com/platform/v2/evm/accounts", nil)
	if err != nil {
		t.Fatalf("failed to build request: %v", err)
	}

	fn := apiKeyHeaderFn(ClientOptions{})
	if err := fn(context.Background(), req); err == nil {
		t.Fatal("expected an error for a non-public operation without credentials, got nil")
	}
}

func TestApiKeyHeaderFnAuthenticatesNonPublicOperationsWithCredentials(t *testing.T) {
	ecKey := generateTestECKeyForCdpTest(t)

	req, err := http.NewRequest(http.MethodGet, "https://api.cdp.coinbase.com/platform/v2/evm/accounts", nil)
	if err != nil {
		t.Fatalf("failed to build request: %v", err)
	}

	fn := apiKeyHeaderFn(ClientOptions{
		APIKeyID:     "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
		APIKeySecret: ecKey,
	})
	if err := fn(context.Background(), req); err != nil {
		t.Fatalf("apiKeyHeaderFn returned an unexpected error: %v", err)
	}

	if got := req.Header.Get("Authorization"); got == "" {
		t.Error("expected an Authorization header to be set for a non-public operation")
	}
}

func TestApiKeyHeaderFnStillAuthenticatesPublicOperationsWhenCredentialsPresent(t *testing.T) {
	ecKey := generateTestECKeyForCdpTest(t)

	req, err := http.NewRequest(http.MethodPost, "https://api.cdp.coinbase.com/platform/v2/x402/validate", nil)
	if err != nil {
		t.Fatalf("failed to build request: %v", err)
	}

	fn := apiKeyHeaderFn(ClientOptions{
		APIKeyID:     "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
		APIKeySecret: ecKey,
	})
	if err := fn(context.Background(), req); err != nil {
		t.Fatalf("apiKeyHeaderFn returned an unexpected error: %v", err)
	}

	// Public operations skip JWT generation entirely, even when credentials are configured.
	if got := req.Header.Get("Authorization"); got != "" {
		t.Errorf("expected no Authorization header for a public operation, got %q", got)
	}
}

func TestWalletHeaderFnSkipsPublicOperations(t *testing.T) {
	// Add a synthetic public operation that overlaps a wallet-auth route to prove
	// walletHeaderFn checks the public-operation gate before wallet auth matching.
	original := openapi.PublicOperations
	openapi.PublicOperations = append(openapi.PublicOperations, openapi.PublicOperation{
		Method:      http.MethodPost,
		PathPattern: regexp.MustCompile(`/v2/accounts$`),
	})
	defer func() {
		openapi.PublicOperations = original
	}()

	req, err := http.NewRequest(http.MethodPost, "https://api.cdp.coinbase.com/platform/v2/accounts", nil)
	if err != nil {
		t.Fatalf("failed to build request: %v", err)
	}

	fn := walletHeaderFn(ClientOptions{
		WalletSecret: "invalid-wallet-secret",
	})
	if err := fn(context.Background(), req); err != nil {
		t.Fatalf("walletHeaderFn returned an unexpected error for a public operation: %v", err)
	}

	if got := req.Header.Get("X-Wallet-Auth"); got != "" {
		t.Errorf("expected no X-Wallet-Auth header for a public operation, got %q", got)
	}
}
