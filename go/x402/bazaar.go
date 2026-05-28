package x402

import (
	"context"
	"fmt"
	"net/http"

	"github.com/coinbase/cdp-sdk/go/openapi"
)

// CdpBazaarClient wraps the SDK-generated openapi.ClientWithResponses to expose
// discovery-only methods. It injects a Correlation-Context header on every request
// and does not require CDP API key credentials.
type CdpBazaarClient struct {
	api *openapi.ClientWithResponses
}

// ListDiscoveryResources lists x402 resources from the CDP Bazaar.
//
// Params may be nil to list all resources without filtering.
func (c *CdpBazaarClient) ListDiscoveryResources(
	ctx context.Context,
	params *openapi.ListX402DiscoveryResourcesParams,
) (*openapi.X402DiscoveryResourcesResponse, error) {
	resp, err := c.api.ListX402DiscoveryResourcesWithResponse(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	if resp.JSON200 == nil {
		return nil, fmt.Errorf("CDP Bazaar request failed (%d): %s", resp.StatusCode(), string(resp.Body))
	}
	return resp.JSON200, nil
}

// SearchDiscoveryResources searches x402 resources in the CDP Bazaar using a
// natural-language query and optional filters.
func (c *CdpBazaarClient) SearchDiscoveryResources(
	ctx context.Context,
	params *openapi.SearchX402ResourcesParams,
) (*openapi.X402SearchResourcesResponse, error) {
	resp, err := c.api.SearchX402ResourcesWithResponse(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	if resp.JSON200 == nil {
		return nil, fmt.Errorf("CDP Bazaar request failed (%d): %s", resp.StatusCode(), string(resp.Body))
	}
	return resp.JSON200, nil
}

// GetMerchantResources fetches all resources registered by a specific merchant
// address in the CDP Bazaar. PayTo is required.
func (c *CdpBazaarClient) GetMerchantResources(
	ctx context.Context,
	params *openapi.ListX402DiscoveryMerchantParams,
) (*openapi.X402DiscoveryMerchantResponse, error) {
	if params == nil || params.PayTo == "" {
		return nil, fmt.Errorf("payTo is required")
	}
	resp, err := c.api.ListX402DiscoveryMerchantWithResponse(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	if resp.JSON200 == nil {
		return nil, fmt.Errorf("CDP Bazaar request failed (%d): %s", resp.StatusCode(), string(resp.Body))
	}
	return resp.JSON200, nil
}

// CreateCdpBazaarClient creates a CDP Bazaar client for discovering and
// searching x402-gated resources.
//
// The CDP Bazaar discovery endpoints are unauthenticated. Only a
// Correlation-Context header is sent; no credentials are required.
//
// Example:
//
//	client := x402.CreateCdpBazaarClient()
//
//	limit := 20
//	resources, err := client.ListDiscoveryResources(ctx, &openapi.ListX402DiscoveryResourcesParams{
//	    Limit: &limit,
//	})
func CreateCdpBazaarClient() *CdpBazaarClient {
	return createCdpBazaarClientWithServer(CdpAPIBaseURL)
}

func createCdpBazaarClientWithServer(server string) *CdpBazaarClient {
	client, err := openapi.NewClientWithResponses(server, openapi.WithRequestEditorFn(
		func(_ context.Context, req *http.Request) error {
			req.Header.Set("Correlation-Context", cdpCorrelationContext)
			return nil
		},
	))
	if err != nil {
		// NewClientWithResponses only errors on URL parse failure; panic is appropriate here.
		panic(fmt.Sprintf("failed to create CDP Bazaar client: %v", err))
	}
	return &CdpBazaarClient{api: client}
}
