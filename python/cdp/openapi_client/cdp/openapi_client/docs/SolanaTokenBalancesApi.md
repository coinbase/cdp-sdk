# cdp.openapi_client.SolanaTokenBalancesApi

All URIs are relative to *https://api.cdp.coinbase.com/platform*

Method | HTTP request | Description
------------- | ------------- | -------------
[**list_solana_token_balances**](SolanaTokenBalancesApi.md#list_solana_token_balances) | **GET** /v2/solana/token-balances/{network}/{address} | List Solana token balances


# **list_solana_token_balances**
> ListSolanaTokenBalances200Response list_solana_token_balances(address, network, page_size=page_size, page_token=page_token)

List Solana token balances

Lists the token balances of a Solana address on a given network. The balances include SPL tokens and the native SOL token. The response is paginated, and by default, returns 20 balances per page.  **Note:** This endpoint is still under development and does not yet provide strong availability or freshness guarantees. Freshness and availability of new token balances will improve over the coming weeks.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.list_solana_token_balances200_response import ListSolanaTokenBalances200Response
from cdp.openapi_client.models.list_solana_token_balances_network import ListSolanaTokenBalancesNetwork
from cdp.openapi_client.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.cdp.coinbase.com/platform
# See configuration.py for a list of all supported configuration parameters.
configuration = cdp.openapi_client.Configuration(
    host = "https://api.cdp.coinbase.com/platform"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure Bearer authorization (JWT): apiKeyAuth
configuration = cdp.openapi_client.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
async with cdp.openapi_client.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = cdp.openapi_client.SolanaTokenBalancesApi(api_client)
    address = 'HpabPRRCFbBKSuJr5PdkVvQc85FyxyTWkFM2obBRSvHT' # str | The base58 encoded Solana address to get balances for.
    network = cdp.openapi_client.ListSolanaTokenBalancesNetwork() # ListSolanaTokenBalancesNetwork | The human-readable network name to get the balances for.
    page_size = 20 # int | The number of balances to return per page. (optional) (default to 20)
    page_token = 'eyJsYXN0X2lkIjogImFiYzEyMyIsICJ0aW1lc3RhbXAiOiAxNzA3ODIzNzAxfQ==' # str | The token for the next page of balances. Will be empty if there are no more balances to fetch. (optional)

    try:
        # List Solana token balances
        api_response = await api_instance.list_solana_token_balances(address, network, page_size=page_size, page_token=page_token)
        print("The response of SolanaTokenBalancesApi->list_solana_token_balances:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling SolanaTokenBalancesApi->list_solana_token_balances: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **address** | **str**| The base58 encoded Solana address to get balances for. | 
 **network** | [**ListSolanaTokenBalancesNetwork**](.md)| The human-readable network name to get the balances for. | 
 **page_size** | **int**| The number of balances to return per page. | [optional] [default to 20]
 **page_token** | **str**| The token for the next page of balances. Will be empty if there are no more balances to fetch. | [optional] 

### Return type

[**ListSolanaTokenBalances200Response**](ListSolanaTokenBalances200Response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth), [sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully listed token balances. |  -  |
**400** | Invalid request. |  -  |
**404** | Not found. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

