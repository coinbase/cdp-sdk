package cdp

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/coinbase/cdp-sdk/go/auth"
	"github.com/coinbase/cdp-sdk/go/openapi"
)

// ClientOptions contains configuration options for the CDP client.
type ClientOptions struct {
	// APIKeyID is the API key ID.
	APIKeyID string
	// APIKeySecret is the API key secret.
	APIKeySecret string
	// WalletSecret is the wallet secret.
	WalletSecret string
	// Debugging enables debug logging when true.
	Debugging bool
	// BasePath is the host URL to connect to.
	BasePath string
	// Optional expiration time in seconds (defaults to 120).
	ExpiresIn int64
	// HostOverride overrides the host used for request routing and JWT signing.
	// This is for internal use only and should not be used by external consumers.
	HostOverride string
}

// NewClient creates a new CDP client based on the provided options.
func NewClient(options ClientOptions) (*openapi.ClientWithResponses, error) {
	basePath := options.BasePath
	if basePath == "" {
		basePath = "https://api.cdp.coinbase.com/platform"
	}

	opts := []openapi.ClientOption{}

	// Add HostOverride editor FIRST if set (before auth editors that use req.Host)
	if options.HostOverride != "" {
		opts = append(opts, openapi.WithRequestEditorFn(hostOverrideFn(options.HostOverride)))
	}

	opts = append(opts, openapi.WithRequestEditorFn(apiKeyHeaderFn(options)))
	opts = append(opts, openapi.WithRequestEditorFn(walletHeaderFn(options)))

	client, err := openapi.NewClientWithResponses(basePath, opts...)
	if err != nil {
		return nil, fmt.Errorf("failed to create CDP client: %w", err)
	}

	return client, nil
}

// hostOverrideFn sets the Host header to the specified override value.
// This must run before auth editors so they use the correct host for JWT signing.
func hostOverrideFn(hostOverride string) openapi.RequestEditorFn {
	return func(_ context.Context, req *http.Request) error {
		req.Host = hostOverride
		return nil
	}
}

// getRequestHost returns the host to use for JWT signing.
// If HostOverride is set, it takes precedence over req.Host.
func getRequestHost(options ClientOptions, req *http.Request) string {
	if options.HostOverride != "" {
		return options.HostOverride
	}
	return req.Host
}

// apiKeyHeaderFn generates a JWT for the API key and adds it to the request headers.
func apiKeyHeaderFn(options ClientOptions) openapi.RequestEditorFn {
	return func(_ context.Context, req *http.Request) error {
		method := strings.ToUpper(req.Method)
		if method == "" {
			method = "GET"
		}

		jwtOptions := auth.JwtOptions{
			KeyID:         options.APIKeyID,
			KeySecret:     options.APIKeySecret,
			RequestMethod: method,
			RequestHost:   getRequestHost(options, req),
			RequestPath:   req.URL.Path,
			ExpiresIn:     options.ExpiresIn,
		}

		jwt, err := auth.GenerateJWT(jwtOptions)
		if err != nil {
			return fmt.Errorf("failed to generate JWT: %w", err)
		}

		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", jwt))
		req.Header.Set("Content-Type", "application/json")

		return nil
	}
}

// walletHeaderFn generates a JWT for the wallet and adds it to the request headers.
func walletHeaderFn(options ClientOptions) openapi.RequestEditorFn {
	return func(_ context.Context, req *http.Request) error {
		if req.Method != "POST" && req.Method != "DELETE" {
			return nil
		}

		if !strings.Contains(req.URL.Path, "/accounts") &&
			!strings.Contains(req.URL.Path, "/spend-permissions") &&
			!strings.Contains(req.URL.Path, "/user-operations/prepare-and-send") {
			return nil
		}

		var body map[string]interface{}
		bodyBytes, err := io.ReadAll(req.Body)
		if err != nil {
			return fmt.Errorf("failed to read request body: %w", err)
		}

		// Restore the body for future readers
		req.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

		if len(bodyBytes) > 0 {
			if err := json.Unmarshal(bodyBytes, &body); err != nil {
				return fmt.Errorf("failed to parse request body: %w", err)
			}
		} else {
			body = map[string]interface{}{}
		}

		walletJwtOptions := auth.WalletJwtOptions{
			WalletSecret:  options.WalletSecret,
			RequestMethod: req.Method,
			RequestHost:   getRequestHost(options, req),
			RequestPath:   req.URL.Path,
			RequestData:   body,
		}

		walletJwt, err := auth.GenerateWalletJWT(walletJwtOptions)
		if err != nil {
			return fmt.Errorf("failed to generate wallet JWT: %w", err)
		}

		req.Header.Set("X-Wallet-Auth", walletJwt)

		return nil
	}
}
