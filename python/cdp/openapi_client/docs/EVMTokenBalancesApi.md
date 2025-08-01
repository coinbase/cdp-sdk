# cdp.openapi_client.EVMTokenBalancesApi

All URIs are relative to *https://api.cdp.coinbase.com/platform*

Method | HTTP request | Description
------------- | ------------- | -------------
[**list_evm_token_balances**](EVMTokenBalancesApi.md#list_evm_token_balances) | **GET** /v2/evm/token-balances/{network}/{address} | List EVM token balances


# **list_evm_token_balances**
> ListEvmTokenBalances200Response list_evm_token_balances(address, network, page_size=page_size, page_token=page_token)

List EVM token balances

Lists the token balances of an EVM address on a given network. The balances include ERC-20 tokens and the native gas token (usually ETH). The response is paginated, and by default, returns 20 balances per page.  **Note:** This endpoint is still under development and does not yet provide strong freshness guarantees. Specifically, balances of new tokens can, on occasion, take up to ~30 seconds to appear, while balances of tokens already belonging to an address will generally be close to chain tip. Freshness of new token balances will improve over the coming weeks.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.list_evm_token_balances200_response import ListEvmTokenBalances200Response
from cdp.openapi_client.models.list_evm_token_balances_network import ListEvmTokenBalancesNetwork
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
    api_instance = cdp.openapi_client.EVMTokenBalancesApi(api_client)
    address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' # str | The 0x-prefixed EVM address to get balances for. The address does not need to be checksummed.
    network = cdp.openapi_client.ListEvmTokenBalancesNetwork() # ListEvmTokenBalancesNetwork | The human-readable network name to get the balances for.
    page_size = 20 # int | The number of balances to return per page. (optional) (default to 20)
    page_token = 'eyJsYXN0X2lkIjogImFiYzEyMyIsICJ0aW1lc3RhbXAiOiAxNzA3ODIzNzAxfQ==' # str | The token for the next page of balances. Will be empty if there are no more balances to fetch. (optional)

    try:
        # List EVM token balances
        api_response = await api_instance.list_evm_token_balances(address, network, page_size=page_size, page_token=page_token)
        print("The response of EVMTokenBalancesApi->list_evm_token_balances:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EVMTokenBalancesApi->list_evm_token_balances: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **address** | **str**| The 0x-prefixed EVM address to get balances for. The address does not need to be checksummed. | 
 **network** | [**ListEvmTokenBalancesNetwork**](.md)| The human-readable network name to get the balances for. | 
 **page_size** | **int**| The number of balances to return per page. | [optional] [default to 20]
 **page_token** | **str**| The token for the next page of balances. Will be empty if there are no more balances to fetch. | [optional] 

### Return type

[**ListEvmTokenBalances200Response**](ListEvmTokenBalances200Response.md)

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

