# cdp.openapi_client.CORSInternalApi

All URIs are relative to *https://api.cdp.coinbase.com/platform*

Method | HTTP request | Description
------------- | ------------- | -------------
[**add_allowed_origin**](CORSInternalApi.md#add_allowed_origin) | **POST** /v2/cors/allowed-origins | Add an allowed origin
[**list_allowed_origins**](CORSInternalApi.md#list_allowed_origins) | **GET** /v2/cors/allowed-origins | List allowed origins
[**remove_allowed_origin**](CORSInternalApi.md#remove_allowed_origin) | **DELETE** /v2/cors/allowed-origins | Remove an allowed origin


# **add_allowed_origin**
> AddAllowedOrigin200Response add_allowed_origin(add_allowed_origin_request=add_allowed_origin_request)

Add an allowed origin

Add an allowed origin to the CORS configuration for the CDP project's embedded wallets. Origins must be of the form `<scheme>://<host>:<port>`, where `<scheme>` is either `http` or `https`, and `<host>` is a valid hostname. `:<port>` is optional if the port is 80 or 443, but must be  included otherwise (e.g., `http://localhost:3000`). A maximum of 50  origins are allowed.

### Example


```python
import cdp.openapi_client
from cdp.openapi_client.models.add_allowed_origin200_response import AddAllowedOrigin200Response
from cdp.openapi_client.models.add_allowed_origin_request import AddAllowedOriginRequest
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

# Enter a context with an instance of the API client
async with cdp.openapi_client.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = cdp.openapi_client.CORSInternalApi(api_client)
    add_allowed_origin_request = cdp.openapi_client.AddAllowedOriginRequest() # AddAllowedOriginRequest |  (optional)

    try:
        # Add an allowed origin
        api_response = await api_instance.add_allowed_origin(add_allowed_origin_request=add_allowed_origin_request)
        print("The response of CORSInternalApi->add_allowed_origin:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling CORSInternalApi->add_allowed_origin: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **add_allowed_origin_request** | [**AddAllowedOriginRequest**](AddAllowedOriginRequest.md)|  | [optional] 

### Return type

[**AddAllowedOrigin200Response**](AddAllowedOrigin200Response.md)

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully added allowed origin. |  -  |
**400** | Invalid origin. |  -  |
**409** | Origin already exists. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **list_allowed_origins**
> List[str] list_allowed_origins()

List allowed origins

List the allowed origins for the CDP project's embedded wallets. A maximum of 50 origins are allowed.

### Example


```python
import cdp.openapi_client
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

# Enter a context with an instance of the API client
async with cdp.openapi_client.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = cdp.openapi_client.CORSInternalApi(api_client)

    try:
        # List allowed origins
        api_response = await api_instance.list_allowed_origins()
        print("The response of CORSInternalApi->list_allowed_origins:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling CORSInternalApi->list_allowed_origins: %s\n" % e)
```



### Parameters

This endpoint does not need any parameter.

### Return type

**List[str]**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully listed allowed origins. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **remove_allowed_origin**
> remove_allowed_origin(remove_allowed_origin_request=remove_allowed_origin_request)

Remove an allowed origin

Remove an allowed origin from the CORS configuration for the CDP project's embedded wallets.

### Example


```python
import cdp.openapi_client
from cdp.openapi_client.models.remove_allowed_origin_request import RemoveAllowedOriginRequest
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

# Enter a context with an instance of the API client
async with cdp.openapi_client.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = cdp.openapi_client.CORSInternalApi(api_client)
    remove_allowed_origin_request = cdp.openapi_client.RemoveAllowedOriginRequest() # RemoveAllowedOriginRequest |  (optional)

    try:
        # Remove an allowed origin
        await api_instance.remove_allowed_origin(remove_allowed_origin_request=remove_allowed_origin_request)
    except Exception as e:
        print("Exception when calling CORSInternalApi->remove_allowed_origin: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **remove_allowed_origin_request** | [**RemoveAllowedOriginRequest**](RemoveAllowedOriginRequest.md)|  | [optional] 

### Return type

void (empty response body)

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**204** | Successfully removed allowed origin. |  -  |
**400** | Invalid origin. |  -  |
**404** | Origin not found. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

