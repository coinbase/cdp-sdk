package x402

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/coinbase/cdp-sdk/go/auth"
	x402 "github.com/x402-foundation/x402/go"
	x402http "github.com/x402-foundation/x402/go/http"
)

type capturedRequest struct {
	method  string
	path    string
	headers http.Header
	body    []byte
}

func withMockGenerateJWT(
	t *testing.T,
	fn func(auth.JwtOptions) (string, error),
) {
	t.Helper()
	original := generateJWTFn
	generateJWTFn = fn
	t.Cleanup(func() {
		generateJWTFn = original
	})
}

func newFacilitatorServer(t *testing.T) (*httptest.Server, *[]capturedRequest) {
	t.Helper()
	var reqs []capturedRequest

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		reqs = append(reqs, capturedRequest{
			method:  r.Method,
			path:    r.URL.Path,
			headers: r.Header.Clone(),
			body:    body,
		})

		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case FacilitatorVerifyPath:
			_, _ = io.WriteString(w, `{"isValid":true}`)
		case FacilitatorSettlePath:
			_, _ = io.WriteString(w, `{"success":true,"transaction":"0xtx","network":"eip155:8453"}`)
		case FacilitatorSupportedPath:
			_, _ = io.WriteString(w, `{"kinds":[{"x402Version":1,"scheme":"exact","network":"eip155:8453"}],"extensions":[],"signers":{}}`)
		default:
			w.WriteHeader(http.StatusNotFound)
			_, _ = io.WriteString(w, `{"error":"not found"}`)
		}
	}))
	t.Cleanup(srv.Close)

	return srv, &reqs
}

func testPayloadBytes(t *testing.T) []byte {
	t.Helper()
	payload := x402.PaymentPayload{
		X402Version: 2,
		Payload: map[string]interface{}{
			"scheme": "exact",
		},
		Accepted: x402.PaymentRequirements{
			Scheme:            "exact",
			Network:           "eip155:8453",
			Asset:             "usdc",
			Amount:            "1",
			PayTo:             "0x0000000000000000000000000000000000000000",
			MaxTimeoutSeconds: 60,
		},
	}
	b, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}
	return b
}

func testRequirementsBytes(t *testing.T) []byte {
	t.Helper()
	req := x402.PaymentRequirements{
		Scheme:            "exact",
		Network:           "eip155:8453",
		Asset:             "usdc",
		Amount:            "1",
		PayTo:             "0x0000000000000000000000000000000000000000",
		MaxTimeoutSeconds: 60,
	}
	b, err := json.Marshal(req)
	if err != nil {
		t.Fatalf("marshal requirements: %v", err)
	}
	return b
}

func TestCreateCdpFacilitatorClient_UsesServerEnvVars(t *testing.T) {
	t.Setenv("CDP_SERVER_API_KEY_ID", "server-id")
	t.Setenv("CDP_SERVER_API_KEY_SECRET", "server-secret")
	t.Setenv("CDP_API_KEY_ID", "generic-id")
	t.Setenv("CDP_API_KEY_SECRET", "generic-secret")

	var got []auth.JwtOptions
	withMockGenerateJWT(t, func(opts auth.JwtOptions) (string, error) {
		got = append(got, opts)
		return "jwt", nil
	})

	client, err := CreateCdpFacilitatorClient("", "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if client.URL() != CdpFacilitatorURL {
		t.Fatalf("unexpected URL: %s", client.URL())
	}

	_, err = client.GetAuthProvider().GetAuthHeaders(context.Background())
	if err != nil {
		t.Fatalf("unexpected auth provider error: %v", err)
	}
	if len(got) != 3 {
		t.Fatalf("expected 3 JWT calls, got %d", len(got))
	}
	for _, call := range got {
		if call.KeyID != "server-id" {
			t.Fatalf("expected server-id, got %s", call.KeyID)
		}
		if call.KeySecret != "server-secret" {
			t.Fatal("expected server-secret")
		}
	}
}

func TestCreateCdpFacilitatorClient_UsesGenericEnvVarsFallback(t *testing.T) {
	t.Setenv("CDP_SERVER_API_KEY_ID", "")
	t.Setenv("CDP_SERVER_API_KEY_SECRET", "")
	t.Setenv("CDP_API_KEY_ID", "env-id")
	t.Setenv("CDP_API_KEY_SECRET", "env-secret")

	var got []auth.JwtOptions
	withMockGenerateJWT(t, func(opts auth.JwtOptions) (string, error) {
		got = append(got, opts)
		return "jwt", nil
	})

	client, err := CreateCdpFacilitatorClient("", "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if client.URL() != CdpFacilitatorURL {
		t.Fatalf("unexpected URL: %s", client.URL())
	}

	headers, err := client.GetAuthProvider().GetAuthHeaders(context.Background())
	if err != nil {
		t.Fatalf("unexpected auth provider error: %v", err)
	}
	if headers.Verify["Authorization"] != "Bearer jwt" {
		t.Fatalf("unexpected verify auth header: %q", headers.Verify["Authorization"])
	}

	if len(got) != 3 {
		t.Fatalf("expected 3 JWT calls, got %d", len(got))
	}
	for _, call := range got {
		if call.KeyID != "env-id" {
			t.Fatalf("unexpected key id: %s", call.KeyID)
		}
		if call.KeySecret != "env-secret" {
			t.Fatalf("unexpected key secret")
		}
		if call.RequestHost != CdpAPIHost {
			t.Fatalf("unexpected request host: %s", call.RequestHost)
		}
	}
}

func TestCreateCdpFacilitatorClient_ExplicitOverridesEnv(t *testing.T) {
	t.Setenv("CDP_API_KEY_ID", "env-id")
	t.Setenv("CDP_API_KEY_SECRET", "env-secret")

	var got []auth.JwtOptions
	withMockGenerateJWT(t, func(opts auth.JwtOptions) (string, error) {
		got = append(got, opts)
		return "jwt", nil
	})

	client, err := CreateCdpFacilitatorClient("explicit-id", "explicit-secret")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	_, err = client.GetAuthProvider().GetAuthHeaders(context.Background())
	if err != nil {
		t.Fatalf("unexpected auth provider error: %v", err)
	}
	if len(got) == 0 {
		t.Fatal("expected JWT calls")
	}
	for _, call := range got {
		if call.KeyID != "explicit-id" {
			t.Fatalf("unexpected key id: %s", call.KeyID)
		}
		if call.KeySecret != "explicit-secret" {
			t.Fatal("unexpected key secret")
		}
	}
}

func TestCreateCdpFacilitatorClient_ErrorOnMissingBoth(t *testing.T) {
	t.Setenv("CDP_SERVER_API_KEY_ID", "")
	t.Setenv("CDP_SERVER_API_KEY_SECRET", "")
	t.Setenv("CDP_API_KEY_ID", "")
	t.Setenv("CDP_API_KEY_SECRET", "")

	_, err := CreateCdpFacilitatorClient("", "")
	if err == nil {
		t.Fatal("expected error for missing credentials")
	}
	if !strings.Contains(err.Error(), "CDP_SERVER_API_KEY_ID / CDP_API_KEY_ID") {
		t.Errorf("error should mention CDP_SERVER_API_KEY_ID / CDP_API_KEY_ID, got: %v", err)
	}
	if !strings.Contains(err.Error(), "CDP_SERVER_API_KEY_SECRET / CDP_API_KEY_SECRET") {
		t.Errorf("error should mention CDP_SERVER_API_KEY_SECRET / CDP_API_KEY_SECRET, got: %v", err)
	}
}

func TestCreateCdpFacilitatorClient_ErrorOnMissingID(t *testing.T) {
	t.Setenv("CDP_SERVER_API_KEY_ID", "")
	t.Setenv("CDP_API_KEY_ID", "")
	t.Setenv("CDP_API_KEY_SECRET", "secret")

	_, err := CreateCdpFacilitatorClient("", "")
	if err == nil {
		t.Fatal("expected error for missing key ID")
	}
	if !strings.Contains(err.Error(), "CDP_SERVER_API_KEY_ID / CDP_API_KEY_ID") {
		t.Errorf("error should mention CDP_SERVER_API_KEY_ID / CDP_API_KEY_ID, got: %v", err)
	}
}

func TestCreateCdpFacilitatorClient_ErrorOnMissingSecret(t *testing.T) {
	t.Setenv("CDP_SERVER_API_KEY_SECRET", "")
	t.Setenv("CDP_API_KEY_ID", "id")
	t.Setenv("CDP_API_KEY_SECRET", "")

	_, err := CreateCdpFacilitatorClient("", "")
	if err == nil {
		t.Fatal("expected error for missing key secret")
	}
	if !strings.Contains(err.Error(), "CDP_SERVER_API_KEY_SECRET / CDP_API_KEY_SECRET") {
		t.Errorf("error should mention CDP_SERVER_API_KEY_SECRET / CDP_API_KEY_SECRET, got: %v", err)
	}
}

func TestConstants(t *testing.T) {
	if CdpFacilitatorURL == "" {
		t.Error("CdpFacilitatorURL must not be empty")
	}
	if CdpAPIHost == "" {
		t.Error("CdpAPIHost must not be empty")
	}
	if FacilitatorVerifyPath == "" {
		t.Error("FacilitatorVerifyPath must not be empty")
	}
	if FacilitatorSettlePath == "" {
		t.Error("FacilitatorSettlePath must not be empty")
	}
	if FacilitatorSupportedPath == "" {
		t.Error("FacilitatorSupportedPath must not be empty")
	}
	if len(CdpDefaultNetworks) == 0 {
		t.Error("CdpDefaultNetworks must not be empty")
	}
}

func TestCdpAuthProvider_UsesBasePathForJWTPaths(t *testing.T) {
	var got []auth.JwtOptions
	withMockGenerateJWT(t, func(opts auth.JwtOptions) (string, error) {
		got = append(got, opts)
		return "jwt", nil
	})

	provider := newCdpAuthProvider("id", "secret", "https://example.com/platform/v2/x402/")
	_, err := provider.GetAuthHeaders(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	expected := []struct {
		method string
		path   string
	}{
		{method: "POST", path: "/platform/v2/x402/verify"},
		{method: "POST", path: "/platform/v2/x402/settle"},
		{method: "GET", path: "/platform/v2/x402/supported"},
	}
	if len(got) != len(expected) {
		t.Fatalf("expected %d JWT calls, got %d", len(expected), len(got))
	}
	for i, call := range got {
		if call.RequestMethod != expected[i].method {
			t.Fatalf("call %d method: expected %s, got %s", i, expected[i].method, call.RequestMethod)
		}
		if call.RequestPath != expected[i].path {
			t.Fatalf("call %d path: expected %s, got %s", i, expected[i].path, call.RequestPath)
		}
	}
}

func TestCdpAuthProvider_InvalidBaseURL(t *testing.T) {
	provider := newCdpAuthProvider("id", "secret", "://invalid")
	_, err := provider.GetAuthHeaders(context.Background())
	if err == nil {
		t.Fatal("expected invalid base URL error")
	}
}

func TestHTTPFacilitatorClient_UsesCDPAuthProvider(t *testing.T) {
	srv, reqs := newFacilitatorServer(t)
	payloadJSON := testPayloadBytes(t)
	requirementsJSON := testRequirementsBytes(t)

	withMockGenerateJWT(t, func(opts auth.JwtOptions) (string, error) {
		return "jwt-" + opts.RequestMethod + "-" + opts.RequestPath, nil
	})

	client := x402http.NewFacilitatorClient(&x402http.FacilitatorConfig{
		URL:          srv.URL,
		AuthProvider: newCdpAuthProvider("id", "secret", srv.URL),
	})

	if _, err := client.Verify(context.Background(), payloadJSON, requirementsJSON); err != nil {
		t.Fatalf("verify error: %v", err)
	}
	if _, err := client.Settle(context.Background(), payloadJSON, requirementsJSON); err != nil {
		t.Fatalf("settle error: %v", err)
	}
	if _, err := client.GetSupported(context.Background()); err != nil {
		t.Fatalf("get supported error: %v", err)
	}

	if len(*reqs) != 3 {
		t.Fatalf("expected 3 requests, got %d", len(*reqs))
	}
	expected := []struct {
		method string
		path   string
	}{
		{method: http.MethodPost, path: FacilitatorVerifyPath},
		{method: http.MethodPost, path: FacilitatorSettlePath},
		{method: http.MethodGet, path: FacilitatorSupportedPath},
	}
	for i, req := range *reqs {
		if req.method != expected[i].method {
			t.Fatalf("request %d method: expected %s, got %s", i, expected[i].method, req.method)
		}
		if req.path != expected[i].path {
			t.Fatalf("request %d path: expected %s, got %s", i, expected[i].path, req.path)
		}
		authHeader := req.headers.Get("Authorization")
		if !strings.HasPrefix(authHeader, "Bearer jwt-") {
			t.Fatalf("request %d expected bearer header, got %q", i, authHeader)
		}
		correlationCtx := req.headers.Get("Correlation-Context")
		if !strings.Contains(correlationCtx, "source=cdp-x402") {
			t.Fatalf("request %d expected source=cdp-x402 in Correlation-Context, got %q", i, correlationCtx)
		}
		if !strings.Contains(correlationCtx, "sdkLanguage=go") {
			t.Fatalf("request %d expected sdkLanguage=go in Correlation-Context, got %q", i, correlationCtx)
		}
		if !strings.Contains(correlationCtx, "sourceVersion="+cdpSDKVersion) {
			t.Fatalf("request %d expected sourceVersion=%s in Correlation-Context, got %q", i, cdpSDKVersion, correlationCtx)
		}
	}
}

func TestAuthHeaders_AllEndpointsHaveCorrelationContext(t *testing.T) {
	withMockGenerateJWT(t, func(_ auth.JwtOptions) (string, error) {
		return "jwt", nil
	})

	provider := newCdpAuthProvider("id", "secret", CdpFacilitatorURL)
	headers, err := provider.GetAuthHeaders(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	for name, endpoint := range map[string]map[string]string{
		"Verify":    headers.Verify,
		"Settle":    headers.Settle,
		"Supported": headers.Supported,
		"Bazaar":    headers.Bazaar,
	} {
		correlationCtx, ok := endpoint["Correlation-Context"]
		if !ok {
			t.Errorf("%s headers missing Correlation-Context", name)
			continue
		}
		if !strings.Contains(correlationCtx, "source=cdp-x402") {
			t.Errorf("%s Correlation-Context missing source=cdp-x402: %q", name, correlationCtx)
		}
		if !strings.Contains(correlationCtx, "sdkLanguage=go") {
			t.Errorf("%s Correlation-Context missing sdkLanguage=go: %q", name, correlationCtx)
		}
		if !strings.Contains(correlationCtx, "sourceVersion="+cdpSDKVersion) {
			t.Errorf("%s Correlation-Context missing sourceVersion=%s: %q", name, cdpSDKVersion, correlationCtx)
		}
	}
}

func TestCdpAuthProvider_ReturnsErrorOnJWTFailure(t *testing.T) {
	withMockGenerateJWT(t, func(auth.JwtOptions) (string, error) {
		return "", fmt.Errorf("jwt failure")
	})

	provider := newCdpAuthProvider("id", "secret", CdpFacilitatorURL)
	_, err := provider.GetAuthHeaders(context.Background())
	if err == nil {
		t.Fatal("expected auth provider error")
	}
	if !strings.Contains(err.Error(), "jwt failure") {
		t.Fatalf("expected jwt failure in error, got: %v", err)
	}
}
