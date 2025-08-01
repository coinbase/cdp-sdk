# cdp.openapi_client.OnrampApi

All URIs are relative to *https://api.cdp.coinbase.com/platform*

Method | HTTP request | Description
------------- | ------------- | -------------
[**create_onramp_order**](OnrampApi.md#create_onramp_order) | **POST** /v2/onramp/orders | Create an onramp order
[**get_onramp_order_by_id**](OnrampApi.md#get_onramp_order_by_id) | **GET** /v2/onramp/orders/{orderId} | Get an onramp order by ID


# **create_onramp_order**
> CreateOnrampOrder201Response create_onramp_order(create_onramp_order_request=create_onramp_order_request)

Create an onramp order

Create a new Onramp order or get a quote for an Onramp order. Either `paymentAmount` or `purchaseAmount` must be provided.  This API currently only supports the payment method `GUEST_CHECKOUT_APPLE_PAY`, and the `paymentLink` returned will only work in iOS apps. We do not support web integration via iframes at this time.  For detailed integration instructions and to get access to this API, refer to the  [Apple Pay Onramp API docs](https://docs.cdp.coinbase.com/onramp-&-offramp/onramp-apis/apple-pay-onramp-api).

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.create_onramp_order201_response import CreateOnrampOrder201Response
from cdp.openapi_client.models.create_onramp_order_request import CreateOnrampOrderRequest
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
    api_instance = cdp.openapi_client.OnrampApi(api_client)
    create_onramp_order_request = cdp.openapi_client.CreateOnrampOrderRequest() # CreateOnrampOrderRequest |  (optional)

    try:
        # Create an onramp order
        api_response = await api_instance.create_onramp_order(create_onramp_order_request=create_onramp_order_request)
        print("The response of OnrampApi->create_onramp_order:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling OnrampApi->create_onramp_order: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **create_onramp_order_request** | [**CreateOnrampOrderRequest**](CreateOnrampOrderRequest.md)|  | [optional] 

### Return type

[**CreateOnrampOrder201Response**](CreateOnrampOrder201Response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**201** | Successfully created an onramp order. |  -  |
**400** | Invalid request. |  -  |
**401** | Unauthorized. |  -  |
**429** | Rate limit exceeded. |  -  |
**500** | Internal server error. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_onramp_order_by_id**
> GetOnrampOrderById200Response get_onramp_order_by_id(order_id)

Get an onramp order by ID

Get an onramp order by ID.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.get_onramp_order_by_id200_response import GetOnrampOrderById200Response
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
    api_instance = cdp.openapi_client.OnrampApi(api_client)
    order_id = '123e4567-e89b-12d3-a456-426614174000' # str | The ID of the onramp order to retrieve.

    try:
        # Get an onramp order by ID
        api_response = await api_instance.get_onramp_order_by_id(order_id)
        print("The response of OnrampApi->get_onramp_order_by_id:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling OnrampApi->get_onramp_order_by_id: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **order_id** | **str**| The ID of the onramp order to retrieve. | 

### Return type

[**GetOnrampOrderById200Response**](GetOnrampOrderById200Response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully retrieved an onramp order. |  -  |
**401** | Unauthorized. |  -  |
**404** | Order not found. |  -  |
**429** | Rate limit exceeded. |  -  |
**500** | Internal server error. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

