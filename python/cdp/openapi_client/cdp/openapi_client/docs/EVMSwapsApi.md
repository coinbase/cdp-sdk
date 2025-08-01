# cdp.openapi_client.EVMSwapsApi

All URIs are relative to *https://api.cdp.coinbase.com/platform*

Method | HTTP request | Description
------------- | ------------- | -------------
[**create_evm_swap_quote**](EVMSwapsApi.md#create_evm_swap_quote) | **POST** /v2/evm/swaps | Create a swap quote
[**get_evm_swap_price**](EVMSwapsApi.md#get_evm_swap_price) | **GET** /v2/evm/swaps/quote | Get a price estimate for a swap


# **create_evm_swap_quote**
> CreateSwapQuoteResponseWrapper create_evm_swap_quote(create_evm_swap_quote_request, x_idempotency_key=x_idempotency_key)

Create a swap quote

Create a swap quote, which includes the payload to sign as well as the transaction data needed to execute the swap. The developer is responsible for signing the payload and submitting the transaction to the network in order to execute the swap.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.create_evm_swap_quote_request import CreateEvmSwapQuoteRequest
from cdp.openapi_client.models.create_swap_quote_response_wrapper import CreateSwapQuoteResponseWrapper
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
    api_instance = cdp.openapi_client.EVMSwapsApi(api_client)
    create_evm_swap_quote_request = cdp.openapi_client.CreateEvmSwapQuoteRequest() # CreateEvmSwapQuoteRequest | 
    x_idempotency_key = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  (optional)

    try:
        # Create a swap quote
        api_response = await api_instance.create_evm_swap_quote(create_evm_swap_quote_request, x_idempotency_key=x_idempotency_key)
        print("The response of EVMSwapsApi->create_evm_swap_quote:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EVMSwapsApi->create_evm_swap_quote: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **create_evm_swap_quote_request** | [**CreateEvmSwapQuoteRequest**](CreateEvmSwapQuoteRequest.md)|  | 
 **x_idempotency_key** | **str**| An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  | [optional] 

### Return type

[**CreateSwapQuoteResponseWrapper**](CreateSwapQuoteResponseWrapper.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**201** | Successfully created swap quote. |  -  |
**400** | Invalid request. |  -  |
**403** | Taker not permitted to perform swap. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_evm_swap_price**
> GetSwapPriceResponseWrapper get_evm_swap_price(network, to_token, from_token, from_amount, taker, signer_address=signer_address, gas_price=gas_price, slippage_bps=slippage_bps)

Get a price estimate for a swap

Get a price estimate for a swap between two tokens on an EVM network.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.evm_swaps_network import EvmSwapsNetwork
from cdp.openapi_client.models.get_swap_price_response_wrapper import GetSwapPriceResponseWrapper
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
    api_instance = cdp.openapi_client.EVMSwapsApi(api_client)
    network = cdp.openapi_client.EvmSwapsNetwork() # EvmSwapsNetwork | 
    to_token = 'to_token_example' # str | 
    from_token = 'from_token_example' # str | 
    from_amount = 'from_amount_example' # str | 
    taker = 'taker_example' # str | 
    signer_address = 'signer_address_example' # str |  (optional)
    gas_price = 'gas_price_example' # str |  (optional)
    slippage_bps = 100 # int |  (optional) (default to 100)

    try:
        # Get a price estimate for a swap
        api_response = await api_instance.get_evm_swap_price(network, to_token, from_token, from_amount, taker, signer_address=signer_address, gas_price=gas_price, slippage_bps=slippage_bps)
        print("The response of EVMSwapsApi->get_evm_swap_price:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EVMSwapsApi->get_evm_swap_price: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **network** | [**EvmSwapsNetwork**](.md)|  | 
 **to_token** | **str**|  | 
 **from_token** | **str**|  | 
 **from_amount** | **str**|  | 
 **taker** | **str**|  | 
 **signer_address** | **str**|  | [optional] 
 **gas_price** | **str**|  | [optional] 
 **slippage_bps** | **int**|  | [optional] [default to 100]

### Return type

[**GetSwapPriceResponseWrapper**](GetSwapPriceResponseWrapper.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | A price estimate for the swap. |  -  |
**400** | Invalid request. |  -  |
**403** | Taker not permitted to perform swap. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

