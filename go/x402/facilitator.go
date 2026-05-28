package x402

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"strings"

	"github.com/coinbase/cdp-sdk/go/auth"
	x402http "github.com/x402-foundation/x402/go/http"
)

// cdpCorrelationContext is the Correlation-Context header value sent with
// every CDP request — both the authenticated Facilitator endpoints
// (verify/settle/supported) and the unauthenticated Bazaar discovery endpoints.
const cdpCorrelationContext = "sdkLanguage=go,source=cdp-x402,sourceVersion=" + cdpSDKVersion

var generateJWTFn = auth.GenerateJWT

type cdpAuthProvider struct {
	apiKeyID     string
	apiKeySecret string
	baseURL      string
}

func newCdpAuthProvider(apiKeyID, apiKeySecret, baseURL string) *cdpAuthProvider {
	return &cdpAuthProvider{
		apiKeyID:     apiKeyID,
		apiKeySecret: apiKeySecret,
		baseURL:      baseURL,
	}
}

func (p *cdpAuthProvider) GetAuthHeaders(ctx context.Context) (x402http.AuthHeaders, error) {
	verifyPath, err := facilitatorRequestPath(p.baseURL, FacilitatorVerifyPath)
	if err != nil {
		return x402http.AuthHeaders{}, err
	}
	settlePath, err := facilitatorRequestPath(p.baseURL, FacilitatorSettlePath)
	if err != nil {
		return x402http.AuthHeaders{}, err
	}
	supportedPath, err := facilitatorRequestPath(p.baseURL, FacilitatorSupportedPath)
	if err != nil {
		return x402http.AuthHeaders{}, err
	}

	verifyJWT, err := p.generateScopedJWT(verifyPath, "POST")
	if err != nil {
		return x402http.AuthHeaders{}, err
	}
	settleJWT, err := p.generateScopedJWT(settlePath, "POST")
	if err != nil {
		return x402http.AuthHeaders{}, err
	}
	supportedJWT, err := p.generateScopedJWT(supportedPath, "GET")
	if err != nil {
		return x402http.AuthHeaders{}, err
	}

	return x402http.AuthHeaders{
		Verify: map[string]string{
			"Authorization":       "Bearer " + verifyJWT,
			"Correlation-Context": cdpCorrelationContext,
		},
		Settle: map[string]string{
			"Authorization":       "Bearer " + settleJWT,
			"Correlation-Context": cdpCorrelationContext,
		},
		Supported: map[string]string{
			"Authorization":       "Bearer " + supportedJWT,
			"Correlation-Context": cdpCorrelationContext,
		},
		Bazaar: map[string]string{
			"Correlation-Context": cdpCorrelationContext,
		},
	}, nil
}

func (p *cdpAuthProvider) generateScopedJWT(path, method string) (string, error) {
	jwt, err := generateJWTFn(auth.JwtOptions{
		KeyID:         p.apiKeyID,
		KeySecret:     p.apiKeySecret,
		RequestMethod: method,
		RequestHost:   CdpAPIHost,
		RequestPath:   path,
	})
	if err != nil {
		return "", fmt.Errorf("failed to generate CDP JWT for %s %s: %w", method, path, err)
	}
	return jwt, nil
}

// CreateCdpFacilitatorClient creates a CDP-authenticated x402 facilitator client.
//
// The returned client is pre-configured with the CDP hosted facilitator URL
// and CDP JWT-based authentication. Credentials are resolved in order:
//  1. Explicit arguments (non-empty string)
//  2. CDP_SERVER_API_KEY_ID / CDP_SERVER_API_KEY_SECRET env vars
//  3. CDP_API_KEY_ID / CDP_API_KEY_SECRET env vars
//
// Example:
//
//	client, err := x402.CreateCdpFacilitatorClient("", "")
//	if err != nil {
//	    log.Fatal(err)
//	}
func CreateCdpFacilitatorClient(apiKeyID, apiKeySecret string) (*x402http.HTTPFacilitatorClient, error) {
	if apiKeyID == "" {
		apiKeyID = os.Getenv("CDP_SERVER_API_KEY_ID")
	}
	if apiKeyID == "" {
		apiKeyID = os.Getenv("CDP_API_KEY_ID")
	}
	if apiKeySecret == "" {
		apiKeySecret = os.Getenv("CDP_SERVER_API_KEY_SECRET")
	}
	if apiKeySecret == "" {
		apiKeySecret = os.Getenv("CDP_API_KEY_SECRET")
	}

	var missing []string
	if apiKeyID == "" {
		missing = append(missing, "CDP_SERVER_API_KEY_ID / CDP_API_KEY_ID")
	}
	if apiKeySecret == "" {
		missing = append(missing, "CDP_SERVER_API_KEY_SECRET / CDP_API_KEY_SECRET")
	}
	if len(missing) > 0 {
		return nil, fmt.Errorf(
			"missing required CDP credentials: %v; provide them via arguments or set the corresponding environment variables",
			missing,
		)
	}

	return x402http.NewFacilitatorClient(&x402http.FacilitatorConfig{
		URL:          CdpFacilitatorURL,
		AuthProvider: newCdpAuthProvider(apiKeyID, apiKeySecret, CdpFacilitatorURL),
	}), nil
}

func facilitatorRequestPath(baseURL, endpointPath string) (string, error) {
	parsed, err := url.Parse(baseURL)
	if err != nil {
		return "", fmt.Errorf("invalid facilitator base URL %q: %w", baseURL, err)
	}

	basePath := strings.TrimSuffix(parsed.EscapedPath(), "/")
	if basePath == "" {
		return endpointPath, nil
	}

	return basePath + endpointPath, nil
}
