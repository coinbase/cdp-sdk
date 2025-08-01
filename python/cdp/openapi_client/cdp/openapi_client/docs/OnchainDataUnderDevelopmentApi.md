# cdp.openapi_client.OnchainDataUnderDevelopmentApi

All URIs are relative to *https://api.cdp.coinbase.com/platform*

Method | HTTP request | Description
------------- | ------------- | -------------
[**execute_sql_query**](OnchainDataUnderDevelopmentApi.md#execute_sql_query) | **POST** /v2/data/query | Execute SQL query against blockchain data
[**list_data_token_balances**](OnchainDataUnderDevelopmentApi.md#list_data_token_balances) | **GET** /v2/data/evm/token-balances/{network}/{address} | List EVM token balances
[**list_tokens_for_account**](OnchainDataUnderDevelopmentApi.md#list_tokens_for_account) | **GET** /v2/data/evm/token-ownership/{network}/{address} | List token addresses for account


# **execute_sql_query**
> QueryResult execute_sql_query(query_request)

Execute SQL query against blockchain data

Execute a read-only SQL query against indexed blockchain data including transactions, events, and decoded logs.  This endpoint provides direct SQL access to comprehensive blockchain data across supported networks. Queries are executed against optimized data structures for high-performance analytics.  **Query Limitations:** - Read-only queries only (SELECT statements) - No DDL or DML operations allowed - Standard SQL syntax (ClickHouse dialect)  ### Supported Tables  - `base.transactions` - Base mainnet transaction data including hash, block number, gas usage - `base.decoded_logs` - Base mainnet decoded event logs with contract interactions   - `base.blocks` - Base mainnet block metadata including timestamps and difficulty - `base.wallet_received_token_addresses` - Base mainnet token discovery data per account  ### Query Limits  - Maximum query length: 10,000 characters - Maximum result set: 10,000 rows - Query timeout: 30 seconds 

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.query_request import QueryRequest
from cdp.openapi_client.models.query_result import QueryResult
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
    api_instance = cdp.openapi_client.OnchainDataUnderDevelopmentApi(api_client)
    query_request = cdp.openapi_client.QueryRequest() # QueryRequest | 

    try:
        # Execute SQL query against blockchain data
        api_response = await api_instance.execute_sql_query(query_request)
        print("The response of OnchainDataUnderDevelopmentApi->execute_sql_query:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling OnchainDataUnderDevelopmentApi->execute_sql_query: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **query_request** | [**QueryRequest**](QueryRequest.md)|  | 

### Return type

[**QueryResult**](QueryResult.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth), [sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Query executed successfully. |  -  |
**400** | Invalid query syntax or parameters. |  -  |
**401** | Unauthorized. |  -  |
**429** | Rate limit exceeded. |  -  |
**500** | Internal server error. |  -  |
**504** | Query timeout. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **list_data_token_balances**
> ListEvmTokenBalances200Response list_data_token_balances(address, network, page_size=page_size, page_token=page_token)

List EVM token balances

Lists the token balances of an EVM address on a given network. The balances include ERC-20 tokens and the native gas token (usually ETH). The response is paginated, and by default, returns 20 balances per page.  **Note:** This endpoint provides strong freshness guarantees but may have completeness limitations  until we complete backfill in production environments.

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
    api_instance = cdp.openapi_client.OnchainDataUnderDevelopmentApi(api_client)
    address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' # str | The 0x-prefixed EVM address to get balances for. The address does not need to be checksummed.
    network = cdp.openapi_client.ListEvmTokenBalancesNetwork() # ListEvmTokenBalancesNetwork | The human-readable network name to get the balances for.
    page_size = 20 # int | The number of balances to return per page. (optional) (default to 20)
    page_token = 'eyJsYXN0X2lkIjogImFiYzEyMyIsICJ0aW1lc3RhbXAiOiAxNzA3ODIzNzAxfQ==' # str | The token for the next page of balances. Will be empty if there are no more balances to fetch. (optional)

    try:
        # List EVM token balances
        api_response = await api_instance.list_data_token_balances(address, network, page_size=page_size, page_token=page_token)
        print("The response of OnchainDataUnderDevelopmentApi->list_data_token_balances:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling OnchainDataUnderDevelopmentApi->list_data_token_balances: %s\n" % e)
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

# **list_tokens_for_account**
> AccountTokenAddressesResponse list_tokens_for_account(network, address)

List token addresses for account

Retrieve all token contract addresses that an account has ever received tokens from.  This endpoint analyzes transaction history to discover token interactions for the specified account address. It returns both ERC-20 tokens and native ETH (represented as address(0)).  ### Token Discovery  - Analyzes incoming transfer events and transactions - Includes both current and historical token holdings - Returns unique contract addresses regardless of current balance - Native ETH is included as address(0)  ### Use Cases  - Portfolio analysis and token discovery - Account activity monitoring   - Token balance querying preparation - Historical interaction analysis 

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.account_token_addresses_response import AccountTokenAddressesResponse
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
    api_instance = cdp.openapi_client.OnchainDataUnderDevelopmentApi(api_client)
    network = 'base' # str | The blockchain network to query.
    address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' # str | The account address to analyze for token interactions.

    try:
        # List token addresses for account
        api_response = await api_instance.list_tokens_for_account(network, address)
        print("The response of OnchainDataUnderDevelopmentApi->list_tokens_for_account:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling OnchainDataUnderDevelopmentApi->list_tokens_for_account: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **network** | **str**| The blockchain network to query. | 
 **address** | **str**| The account address to analyze for token interactions. | 

### Return type

[**AccountTokenAddressesResponse**](AccountTokenAddressesResponse.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth), [sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Token addresses retrieved successfully. |  -  |
**400** | Invalid account address format. |  -  |
**401** | Unauthorized. |  -  |
**429** | Rate limit exceeded. |  -  |
**500** | Internal server error. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

