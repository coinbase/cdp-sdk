# cdp.openapi_client.FaucetsApi

All URIs are relative to *https://api.cdp.coinbase.com/platform*

Method | HTTP request | Description
------------- | ------------- | -------------
[**request_evm_faucet**](FaucetsApi.md#request_evm_faucet) | **POST** /v2/evm/faucet | Request funds on EVM test networks
[**request_solana_faucet**](FaucetsApi.md#request_solana_faucet) | **POST** /v2/solana/faucet | Request funds on Solana devnet


# **request_evm_faucet**
> RequestEvmFaucet200Response request_evm_faucet(request_evm_faucet_request=request_evm_faucet_request)

Request funds on EVM test networks

Request funds from the CDP Faucet on supported EVM test networks.  Faucets are available for ETH, USDC, EURC, and cbBTC on Base Sepolia and Ethereum Sepolia, and for ETH only on Ethereum Hoodi.  To prevent abuse, we enforce rate limits within a rolling 24-hour window to control the amount of funds that can be requested. These limits are applied at both the CDP User level and the blockchain address level. A single blockchain address cannot exceed the specified limits, even if multiple users submit requests to the same address.  | Token | Amount per Faucet Request |Rolling 24-hour window Rate Limits| |:-----:|:-------------------------:|:--------------------------------:| | ETH   | 0.0001 ETH                | 0.1 ETH                          | | USDC  | 1 USDC                    | 10 USDC                          | | EURC  | 1 EURC                    | 10 EURC                          | | cbBTC | 0.0001 cbBTC              | 0.001 cbBTC                      | 

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.request_evm_faucet200_response import RequestEvmFaucet200Response
from cdp.openapi_client.models.request_evm_faucet_request import RequestEvmFaucetRequest
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
    api_instance = cdp.openapi_client.FaucetsApi(api_client)
    request_evm_faucet_request = cdp.openapi_client.RequestEvmFaucetRequest() # RequestEvmFaucetRequest |  (optional)

    try:
        # Request funds on EVM test networks
        api_response = await api_instance.request_evm_faucet(request_evm_faucet_request=request_evm_faucet_request)
        print("The response of FaucetsApi->request_evm_faucet:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling FaucetsApi->request_evm_faucet: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **request_evm_faucet_request** | [**RequestEvmFaucetRequest**](RequestEvmFaucetRequest.md)|  | [optional] 

### Return type

[**RequestEvmFaucet200Response**](RequestEvmFaucet200Response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth), [sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully requested funds. |  -  |
**400** | Invalid request. |  -  |
**403** | Access to resource forbidden. |  -  |
**429** | Rate limit exceeded. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **request_solana_faucet**
> RequestSolanaFaucet200Response request_solana_faucet(request_solana_faucet_request=request_solana_faucet_request)

Request funds on Solana devnet

Request funds from the CDP Faucet on Solana devnet.  Faucets are available for SOL.  To prevent abuse, we enforce rate limits within a rolling 24-hour window to control the amount of funds that can be requested. These limits are applied at both the CDP User level and the blockchain address level. A single blockchain address cannot exceed the specified limits, even if multiple users submit requests to the same address.  | Token | Amount per Faucet Request |Rolling 24-hour window Rate Limits| |:-----:|:-------------------------:|:--------------------------------:| | SOL   | 0.00125 SOL               | 0.0125 SOL                       | | USDC  | 1 USDC                    | 10 USDC                          | 

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.request_solana_faucet200_response import RequestSolanaFaucet200Response
from cdp.openapi_client.models.request_solana_faucet_request import RequestSolanaFaucetRequest
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
    api_instance = cdp.openapi_client.FaucetsApi(api_client)
    request_solana_faucet_request = cdp.openapi_client.RequestSolanaFaucetRequest() # RequestSolanaFaucetRequest |  (optional)

    try:
        # Request funds on Solana devnet
        api_response = await api_instance.request_solana_faucet(request_solana_faucet_request=request_solana_faucet_request)
        print("The response of FaucetsApi->request_solana_faucet:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling FaucetsApi->request_solana_faucet: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **request_solana_faucet_request** | [**RequestSolanaFaucetRequest**](RequestSolanaFaucetRequest.md)|  | [optional] 

### Return type

[**RequestSolanaFaucet200Response**](RequestSolanaFaucet200Response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth), [sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully requested funds. |  -  |
**400** | Invalid request. |  -  |
**403** | Access to resource forbidden. |  -  |
**429** | Rate limit exceeded. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

