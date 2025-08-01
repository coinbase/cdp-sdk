# cdp.openapi_client.X402FacilitatorApi

All URIs are relative to *https://api.cdp.coinbase.com/platform*

Method | HTTP request | Description
------------- | ------------- | -------------
[**list_x402_discovery_resources**](X402FacilitatorApi.md#list_x402_discovery_resources) | **GET** /v2/x402/discovery/resources | List discovered x402 resources
[**settle_x402_payment**](X402FacilitatorApi.md#settle_x402_payment) | **POST** /v2/x402/settle | Settle a payment
[**supported_x402_payment_kinds**](X402FacilitatorApi.md#supported_x402_payment_kinds) | **GET** /v2/x402/supported | Get supported payment schemes and networks
[**verify_x402_payment**](X402FacilitatorApi.md#verify_x402_payment) | **POST** /v2/x402/verify | Verify a payment


# **list_x402_discovery_resources**
> X402DiscoveryResourcesResponse list_x402_discovery_resources(type=type, limit=limit, offset=offset)

List discovered x402 resources

Lists all active discovered x402 resources. This endpoint returns resources that have been discovered and cached by the x402 facilitator, including their payment requirements and metadata. The response is paginated, and by default, returns 100 items per page.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.x402_discovery_resources_response import X402DiscoveryResourcesResponse
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
    api_instance = cdp.openapi_client.X402FacilitatorApi(api_client)
    type = 'http' # str | Filter by protocol type (e.g., \"http\", \"mcp\"). Currently, the only supported protocol type is \"http\". (optional)
    limit = 100 # int | The number of discovered x402 resources to return per page. (optional) (default to 100)
    offset = 0 # int | The offset of the first discovered x402 resource to return. (optional) (default to 0)

    try:
        # List discovered x402 resources
        api_response = await api_instance.list_x402_discovery_resources(type=type, limit=limit, offset=offset)
        print("The response of X402FacilitatorApi->list_x402_discovery_resources:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling X402FacilitatorApi->list_x402_discovery_resources: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **type** | **str**| Filter by protocol type (e.g., \&quot;http\&quot;, \&quot;mcp\&quot;). Currently, the only supported protocol type is \&quot;http\&quot;. | [optional] 
 **limit** | **int**| The number of discovered x402 resources to return per page. | [optional] [default to 100]
 **offset** | **int**| The offset of the first discovered x402 resource to return. | [optional] [default to 0]

### Return type

[**X402DiscoveryResourcesResponse**](X402DiscoveryResourcesResponse.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully retrieved discovery list. |  -  |
**400** | Invalid request. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **settle_x402_payment**
> SettleX402Payment200Response settle_x402_payment(verify_x402_payment_request)

Settle a payment

Settle an x402 protocol payment with a specific scheme and network.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.settle_x402_payment200_response import SettleX402Payment200Response
from cdp.openapi_client.models.verify_x402_payment_request import VerifyX402PaymentRequest
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
    api_instance = cdp.openapi_client.X402FacilitatorApi(api_client)
    verify_x402_payment_request = cdp.openapi_client.VerifyX402PaymentRequest() # VerifyX402PaymentRequest | 

    try:
        # Settle a payment
        api_response = await api_instance.settle_x402_payment(verify_x402_payment_request)
        print("The response of X402FacilitatorApi->settle_x402_payment:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling X402FacilitatorApi->settle_x402_payment: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **verify_x402_payment_request** | [**VerifyX402PaymentRequest**](VerifyX402PaymentRequest.md)|  | 

### Return type

[**SettleX402Payment200Response**](SettleX402Payment200Response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully settled payment on the x402 protocol. |  -  |
**400** | Invalid request. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **supported_x402_payment_kinds**
> SupportedX402PaymentKinds200Response supported_x402_payment_kinds()

Get supported payment schemes and networks

Get the supported x402 protocol payment schemes and networks that the facilitator is able to verify and settle payments for.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.supported_x402_payment_kinds200_response import SupportedX402PaymentKinds200Response
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
    api_instance = cdp.openapi_client.X402FacilitatorApi(api_client)

    try:
        # Get supported payment schemes and networks
        api_response = await api_instance.supported_x402_payment_kinds()
        print("The response of X402FacilitatorApi->supported_x402_payment_kinds:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling X402FacilitatorApi->supported_x402_payment_kinds: %s\n" % e)
```



### Parameters

This endpoint does not need any parameter.

### Return type

[**SupportedX402PaymentKinds200Response**](SupportedX402PaymentKinds200Response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully retrieved supported payment kinds for the x402 protocol. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **verify_x402_payment**
> VerifyX402Payment200Response verify_x402_payment(verify_x402_payment_request)

Verify a payment

Verify an x402 protocol payment with a specific scheme and network.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.verify_x402_payment200_response import VerifyX402Payment200Response
from cdp.openapi_client.models.verify_x402_payment_request import VerifyX402PaymentRequest
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
    api_instance = cdp.openapi_client.X402FacilitatorApi(api_client)
    verify_x402_payment_request = cdp.openapi_client.VerifyX402PaymentRequest() # VerifyX402PaymentRequest | 

    try:
        # Verify a payment
        api_response = await api_instance.verify_x402_payment(verify_x402_payment_request)
        print("The response of X402FacilitatorApi->verify_x402_payment:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling X402FacilitatorApi->verify_x402_payment: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **verify_x402_payment_request** | [**VerifyX402PaymentRequest**](VerifyX402PaymentRequest.md)|  | 

### Return type

[**VerifyX402Payment200Response**](VerifyX402Payment200Response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully verified payment on the x402 protocol. |  -  |
**400** | Invalid request. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

