package x402

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/coinbase/cdp-sdk/go/auth"
	"github.com/coinbase/cdp-sdk/go/openapi"
)

// newBazaarServer starts a test server that handles /discovery/resources,
// /discovery/search, and /discovery/merchant.
func newBazaarServer(t *testing.T) (*httptest.Server, *[]capturedRequest) {
	t.Helper()
	var reqs []capturedRequest

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		reqs = append(reqs, capturedRequest{
			method:  r.Method,
			path:    r.URL.Path + "?" + r.URL.RawQuery,
			headers: r.Header.Clone(),
			body:    body,
		})

		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/v2/x402/discovery/resources":
			_, _ = io.WriteString(w, `{"x402Version":2,"items":[],"pagination":{"limit":20,"offset":0,"total":0}}`)
		case "/v2/x402/discovery/search":
			_, _ = io.WriteString(w, `{"x402Version":2,"resources":[],"partialResults":false}`)
		case "/v2/x402/discovery/merchant":
			_, _ = io.WriteString(w, `{"x402Version":2,"payTo":"0xabc","resources":[],"pagination":{"limit":25,"offset":0,"total":0}}`)
		default:
			w.WriteHeader(http.StatusNotFound)
			_, _ = io.WriteString(w, `{"error":"not found"}`)
		}
	}))
	t.Cleanup(srv.Close)

	return srv, &reqs
}

func newBazaarTestClient(t *testing.T, serverURL string) *CdpBazaarClient {
	t.Helper()
	return createCdpBazaarClientWithServer(serverURL)
}

func TestCreateCdpBazaarClient_DoesNotRequireCredentials(t *testing.T) {
	client := CreateCdpBazaarClient()
	if client == nil {
		t.Fatal("expected non-nil CdpBazaarClient")
	}
}

func TestCreateCdpBazaarClient_ReturnsCdpBazaarClient(t *testing.T) {
	client := CreateCdpBazaarClient()

	// Compile-time check: client must be *CdpBazaarClient
	var _ = client
}

// ---------------------------------------------------------------------------
// AuthHeaders.Bazaar test
// ---------------------------------------------------------------------------

func TestAuthHeaders_BazaarFieldHasCorrelationContext(t *testing.T) {
	withMockGenerateJWT(t, func(_ auth.JwtOptions) (string, error) {
		return "jwt", nil
	})

	provider := newCdpAuthProvider("id", "secret", CdpFacilitatorURL)
	headers, err := provider.GetAuthHeaders(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if headers.Bazaar == nil {
		t.Fatal("expected Bazaar auth headers to be set")
	}
	correlationCtx, ok := headers.Bazaar["Correlation-Context"]
	if !ok {
		t.Fatal("expected Correlation-Context key in Bazaar headers")
	}
	if !strings.Contains(correlationCtx, "cdp-x402") {
		t.Errorf("expected cdp-x402 in Correlation-Context, got: %s", correlationCtx)
	}
	if !strings.Contains(correlationCtx, "sdkLanguage=go") {
		t.Errorf("expected sdkLanguage=go in Correlation-Context, got: %s", correlationCtx)
	}
}

func TestAuthHeaders_BazaarDoesNotContainJWT(t *testing.T) {
	withMockGenerateJWT(t, func(_ auth.JwtOptions) (string, error) {
		return "jwt", nil
	})

	provider := newCdpAuthProvider("id", "secret", CdpFacilitatorURL)
	headers, err := provider.GetAuthHeaders(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if _, hasAuth := headers.Bazaar["Authorization"]; hasAuth {
		t.Error("Bazaar headers must not contain Authorization (no JWT for discovery)")
	}
}

func TestBazaarClient_ListDiscoveryResources_UsesCorrectPath(t *testing.T) {
	srv, reqs := newBazaarServer(t)
	client := newBazaarTestClient(t, srv.URL)

	_, err := client.ListDiscoveryResources(context.Background(), nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(*reqs) != 1 {
		t.Fatalf("expected 1 request, got %d", len(*reqs))
	}
	if !strings.HasPrefix((*reqs)[0].path, "/v2/x402/discovery/resources") {
		t.Errorf("unexpected path: %s", (*reqs)[0].path)
	}
}

func TestBazaarClient_ListDiscoveryResources_UsesGET(t *testing.T) {
	srv, reqs := newBazaarServer(t)
	client := newBazaarTestClient(t, srv.URL)

	_, _ = client.ListDiscoveryResources(context.Background(), nil)

	if (*reqs)[0].method != http.MethodGet {
		t.Errorf("expected GET, got %s", (*reqs)[0].method)
	}
}

func TestBazaarClient_ListDiscoveryResources_SendsCorrelationContextHeader(t *testing.T) {
	srv, reqs := newBazaarServer(t)
	client := newBazaarTestClient(t, srv.URL)

	_, err := client.ListDiscoveryResources(context.Background(), nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	correlationCtx := (*reqs)[0].headers.Get("Correlation-Context")
	if !strings.Contains(correlationCtx, "cdp-x402") {
		t.Errorf("expected cdp-x402 in Correlation-Context, got: %q", correlationCtx)
	}
}

func TestBazaarClient_ListDiscoveryResources_AppendsTypeParam(t *testing.T) {
	srv, reqs := newBazaarServer(t)
	client := newBazaarTestClient(t, srv.URL)

	typ := "http"
	limit := 5
	_, _ = client.ListDiscoveryResources(context.Background(), &openapi.ListX402DiscoveryResourcesParams{
		Type:  &typ,
		Limit: &limit,
	})

	queryStr := (*reqs)[0].path
	if !strings.Contains(queryStr, "type=http") {
		t.Errorf("expected type=http in query, got: %s", queryStr)
	}
	if !strings.Contains(queryStr, "limit=5") {
		t.Errorf("expected limit=5 in query, got: %s", queryStr)
	}
}

func TestBazaarClient_ListDiscoveryResources_ParsesItems(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		payload := map[string]any{
			"x402Version": 2,
			"items": []any{
				map[string]any{
					"resource":    "https://api.example.com/weather",
					"description": "Real-time weather data",
					"type":        "http",
					"x402Version": 2,
					"accepts":     []any{},
					"lastUpdated": "2026-01-01T00:00:00Z",
				},
			},
			"pagination": map[string]any{"limit": 20, "offset": 0, "total": 1},
		}
		_ = json.NewEncoder(w).Encode(payload)
	}))
	t.Cleanup(srv.Close)

	client := newBazaarTestClient(t, srv.URL)
	result, err := client.ListDiscoveryResources(context.Background(), nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.X402Version != 2 {
		t.Errorf("expected x402Version=2, got %d", result.X402Version)
	}
	if len(result.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(result.Items))
	}
	if result.Items[0].Resource != "https://api.example.com/weather" {
		t.Errorf("unexpected resource: %s", result.Items[0].Resource)
	}
	if result.Items[0].Description == nil || *result.Items[0].Description != "Real-time weather data" {
		t.Errorf("expected description, got: %v", result.Items[0].Description)
	}
	if result.Pagination.Total == nil || *result.Pagination.Total != 1 {
		t.Errorf("expected pagination.total=1, got %v", result.Pagination.Total)
	}
}

func TestBazaarClient_ListDiscoveryResources_ParsesQuality(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		payload := map[string]any{
			"x402Version": 2,
			"items": []any{
				map[string]any{
					"resource":    "https://api.example.com/weather",
					"type":        "http",
					"x402Version": 2,
					"quality": map[string]any{
						"l30DaysTotalCalls":   42,
						"l30DaysUniquePayers": 7,
					},
				},
			},
			"pagination": map[string]any{"limit": 20, "offset": 0, "total": 1},
		}
		_ = json.NewEncoder(w).Encode(payload)
	}))
	t.Cleanup(srv.Close)

	client := newBazaarTestClient(t, srv.URL)
	result, err := client.ListDiscoveryResources(context.Background(), nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	item := result.Items[0]
	if item.Quality == nil {
		t.Fatal("expected non-nil quality")
	}
	if item.Quality.L30DaysTotalCalls == nil || *item.Quality.L30DaysTotalCalls != 42 {
		t.Errorf("expected l30DaysTotalCalls=42, got %v", item.Quality.L30DaysTotalCalls)
	}
	if item.Quality.L30DaysUniquePayers == nil || *item.Quality.L30DaysUniquePayers != 7 {
		t.Errorf("expected l30DaysUniquePayers=7, got %v", item.Quality.L30DaysUniquePayers)
	}
}

// ---------------------------------------------------------------------------
// SearchDiscoveryResources request/response tests
// ---------------------------------------------------------------------------

func TestBazaarClient_SearchDiscoveryResources_UsesCorrectPath(t *testing.T) {
	srv, reqs := newBazaarServer(t)
	client := newBazaarTestClient(t, srv.URL)

	query := "weather"
	_, err := client.SearchDiscoveryResources(context.Background(), &openapi.SearchX402ResourcesParams{
		Query: &query,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(*reqs) != 1 {
		t.Fatalf("expected 1 request, got %d", len(*reqs))
	}
	if !strings.HasPrefix((*reqs)[0].path, "/v2/x402/discovery/search") {
		t.Errorf("unexpected path: %s", (*reqs)[0].path)
	}
}

func TestBazaarClient_SearchDiscoveryResources_UsesGET(t *testing.T) {
	srv, reqs := newBazaarServer(t)
	client := newBazaarTestClient(t, srv.URL)

	query := "test"
	_, _ = client.SearchDiscoveryResources(context.Background(), &openapi.SearchX402ResourcesParams{
		Query: &query,
	})

	if (*reqs)[0].method != http.MethodGet {
		t.Errorf("expected GET, got %s", (*reqs)[0].method)
	}
}

func TestBazaarClient_SearchDiscoveryResources_AppendsQueryAndFilters(t *testing.T) {
	srv, reqs := newBazaarServer(t)
	client := newBazaarTestClient(t, srv.URL)

	query := "weather APIs"
	network := "eip155:8453"
	asset := "0xabc"
	maxPrice := "1.50"
	limit := 10
	_, _ = client.SearchDiscoveryResources(context.Background(), &openapi.SearchX402ResourcesParams{
		Query:       &query,
		Network:     &network,
		Asset:       &asset,
		MaxUsdPrice: &maxPrice,
		Limit:       &limit,
	})

	queryStr := (*reqs)[0].path
	if !strings.Contains(queryStr, "query=") {
		t.Errorf("expected query param, got: %s", queryStr)
	}
	if !strings.Contains(queryStr, "network=eip155") {
		t.Errorf("expected network param, got: %s", queryStr)
	}
	if !strings.Contains(queryStr, "asset=0xabc") {
		t.Errorf("expected asset param, got: %s", queryStr)
	}
	if !strings.Contains(queryStr, "maxUsdPrice=1.50") {
		t.Errorf("expected maxUsdPrice param, got: %s", queryStr)
	}
	if !strings.Contains(queryStr, "limit=10") {
		t.Errorf("expected limit=10, got: %s", queryStr)
	}
}

func TestBazaarClient_SearchDiscoveryResources_ParsesResources(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		payload := map[string]any{
			"x402Version": 2,
			"resources": []any{
				map[string]any{
					"resource":    "https://api.example.com/weather",
					"description": "Weather API",
					"type":        "http",
					"x402Version": 2,
					"accepts":     []any{},
				},
			},
			"partialResults": true,
			"searchMethod":   "vector",
		}
		_ = json.NewEncoder(w).Encode(payload)
	}))
	t.Cleanup(srv.Close)

	client := newBazaarTestClient(t, srv.URL)
	query := "weather"
	result, err := client.SearchDiscoveryResources(context.Background(), &openapi.SearchX402ResourcesParams{
		Query: &query,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(result.Resources) != 1 {
		t.Fatalf("expected 1 resource, got %d", len(result.Resources))
	}
	if result.Resources[0].Resource != "https://api.example.com/weather" {
		t.Errorf("unexpected resource: %s", result.Resources[0].Resource)
	}
	if result.Resources[0].Description == nil || *result.Resources[0].Description != "Weather API" {
		t.Errorf("expected description, got: %v", result.Resources[0].Description)
	}
	if !result.PartialResults {
		t.Error("expected partialResults=true")
	}
	if result.SearchMethod == nil || string(*result.SearchMethod) != "vector" {
		t.Errorf("expected searchMethod=vector, got: %v", result.SearchMethod)
	}
}

// ---------------------------------------------------------------------------
// GetMerchantResources request/response tests
// ---------------------------------------------------------------------------

func TestBazaarClient_GetMerchantResources_UsesCorrectPath(t *testing.T) {
	srv, reqs := newBazaarServer(t)
	client := newBazaarTestClient(t, srv.URL)

	_, err := client.GetMerchantResources(context.Background(), &openapi.ListX402DiscoveryMerchantParams{
		PayTo: "0xabc",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(*reqs) != 1 {
		t.Fatalf("expected 1 request, got %d", len(*reqs))
	}
	if !strings.HasPrefix((*reqs)[0].path, "/v2/x402/discovery/merchant") {
		t.Errorf("unexpected path: %s", (*reqs)[0].path)
	}
}

func TestBazaarClient_GetMerchantResources_AppendsPayToParam(t *testing.T) {
	srv, reqs := newBazaarServer(t)
	client := newBazaarTestClient(t, srv.URL)

	_, _ = client.GetMerchantResources(context.Background(), &openapi.ListX402DiscoveryMerchantParams{
		PayTo: "0xabc123",
	})

	queryStr := (*reqs)[0].path
	if !strings.Contains(queryStr, "payTo=0xabc123") {
		t.Errorf("expected payTo=0xabc123 in query, got: %s", queryStr)
	}
}

func TestBazaarClient_GetMerchantResources_AppendsPagination(t *testing.T) {
	srv, reqs := newBazaarServer(t)
	client := newBazaarTestClient(t, srv.URL)

	limit := 10
	offset := 5
	_, _ = client.GetMerchantResources(context.Background(), &openapi.ListX402DiscoveryMerchantParams{
		PayTo:  "0xabc",
		Limit:  &limit,
		Offset: &offset,
	})

	queryStr := (*reqs)[0].path
	if !strings.Contains(queryStr, "limit=10") {
		t.Errorf("expected limit=10, got: %s", queryStr)
	}
	if !strings.Contains(queryStr, "offset=5") {
		t.Errorf("expected offset=5, got: %s", queryStr)
	}
}

func TestBazaarClient_GetMerchantResources_RequiresPayTo(t *testing.T) {
	srv, _ := newBazaarServer(t)
	client := newBazaarTestClient(t, srv.URL)

	_, err := client.GetMerchantResources(context.Background(), nil)
	if err == nil {
		t.Fatal("expected error for nil params (missing payTo)")
	}

	_, err = client.GetMerchantResources(context.Background(), &openapi.ListX402DiscoveryMerchantParams{})
	if err == nil {
		t.Fatal("expected error for empty payTo")
	}
}

func TestBazaarClient_GetMerchantResources_ParsesResponse(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		payload := map[string]any{
			"x402Version": 2,
			"payTo":       "0xmerchant",
			"resources": []any{
				map[string]any{
					"resource":    "https://api.example.com/data",
					"type":        "http",
					"x402Version": 2,
				},
			},
			"pagination": map[string]any{"limit": 25, "offset": 0, "total": 1},
		}
		_ = json.NewEncoder(w).Encode(payload)
	}))
	t.Cleanup(srv.Close)

	client := newBazaarTestClient(t, srv.URL)
	result, err := client.GetMerchantResources(context.Background(), &openapi.ListX402DiscoveryMerchantParams{
		PayTo: "0xmerchant",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.PayTo != "0xmerchant" {
		t.Errorf("expected payTo=0xmerchant, got: %s", result.PayTo)
	}
	if len(result.Resources) != 1 {
		t.Fatalf("expected 1 resource, got %d", len(result.Resources))
	}
	if result.Resources[0].Resource != "https://api.example.com/data" {
		t.Errorf("unexpected resource: %s", result.Resources[0].Resource)
	}
	if result.Pagination.Total == nil || *result.Pagination.Total != 1 {
		t.Errorf("expected pagination.total=1, got %v", result.Pagination.Total)
	}
}

func TestBazaarClient_ErrorResponse(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = io.WriteString(w, `{"error":"internal server error"}`)
	}))
	t.Cleanup(srv.Close)

	client := newBazaarTestClient(t, srv.URL)
	_, err := client.ListDiscoveryResources(context.Background(), nil)
	if err == nil {
		t.Fatal("expected error for 500 response")
	}
	if !strings.Contains(err.Error(), "500") {
		t.Errorf("expected 500 in error, got: %s", err)
	}
}

// ---------------------------------------------------------------------------
// Integration test — runs against the real CDP Bazaar.
// ---------------------------------------------------------------------------

func TestBazaarClient_Integration_ListAndSearch(t *testing.T) {
	client := CreateCdpBazaarClient()

	t.Run("ListDiscoveryResources", func(t *testing.T) {
		limit := 5
		result, err := client.ListDiscoveryResources(context.Background(), &openapi.ListX402DiscoveryResourcesParams{
			Limit: &limit,
		})
		if err != nil {
			t.Fatalf("ListDiscoveryResources: %v", err)
		}
		if result == nil {
			t.Fatal("expected non-nil result")
		}
		t.Logf("total resources: %v, returned: %d", result.Pagination.Total, len(result.Items))

		for _, item := range result.Items {
			if item.Resource == "" {
				t.Error("unexpected empty resource URL")
			}
			if item.Type == "" {
				t.Error("unexpected empty resource type")
			}
		}
	})

	t.Run("SearchDiscoveryResources", func(t *testing.T) {
		query := "weather"
		limit := 5
		result, err := client.SearchDiscoveryResources(context.Background(), &openapi.SearchX402ResourcesParams{
			Query: &query,
			Limit: &limit,
		})
		if err != nil {
			t.Fatalf("SearchDiscoveryResources: %v", err)
		}
		if result == nil {
			t.Fatal("expected non-nil result")
		}
		t.Logf("search returned %d resources, partialResults=%v, searchMethod=%v",
			len(result.Resources), result.PartialResults, result.SearchMethod)
	})
}
