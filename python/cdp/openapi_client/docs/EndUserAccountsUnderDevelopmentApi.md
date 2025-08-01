# cdp.openapi_client.EndUserAccountsUnderDevelopmentApi

All URIs are relative to *https://api.cdp.coinbase.com/platform*

Method | HTTP request | Description
------------- | ------------- | -------------
[**create_end_user**](EndUserAccountsUnderDevelopmentApi.md#create_end_user) | **POST** /v2/end-users | Create an end user
[**get_end_user**](EndUserAccountsUnderDevelopmentApi.md#get_end_user) | **GET** /v2/end-users/{userId} | Get an end user


# **create_end_user**
> EndUser create_end_user(x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, create_end_user_request=create_end_user_request)

Create an end user

Creates an end user. An end user is an entity that owns a set of CDP EVM accounts, EVM smart accounts, and/or Solana accounts. 1 or more authentication methods must be associated with an end user.  This API is intended to be used by the developer's own backend, and is authenticated using the developer's CDP API key.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.create_end_user_request import CreateEndUserRequest
from cdp.openapi_client.models.end_user import EndUser
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
    api_instance = cdp.openapi_client.EndUserAccountsUnderDevelopmentApi(api_client)
    x_wallet_auth = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywicm9sZSI6ImFkbWluIiwiZXhwIjoxNzAxOTgwMDAwfQ.HWvMTKmCCTxHaxjvZyLaC6UQ6TV3ErTDWBf7zmdH0Lw' # str | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  (optional)
    x_idempotency_key = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  (optional)
    create_end_user_request = cdp.openapi_client.CreateEndUserRequest() # CreateEndUserRequest |  (optional)

    try:
        # Create an end user
        api_response = await api_instance.create_end_user(x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, create_end_user_request=create_end_user_request)
        print("The response of EndUserAccountsUnderDevelopmentApi->create_end_user:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EndUserAccountsUnderDevelopmentApi->create_end_user: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **x_wallet_auth** | **str**| A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [optional] 
 **x_idempotency_key** | **str**| An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  | [optional] 
 **create_end_user_request** | [**CreateEndUserRequest**](CreateEndUserRequest.md)|  | [optional] 

### Return type

[**EndUser**](EndUser.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**201** | Successfully created end user. |  -  |
**400** | Invalid request. |  -  |
**401** | Unauthorized. |  -  |
**422** | Idempotency key conflict. |  -  |
**500** | Internal server error. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_end_user**
> EndUser get_end_user(user_id)

Get an end user

Gets an end user by ID.  This API is intended to be used by the developer's own backend, and is authenticated using the developer's CDP API key.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.end_user import EndUser
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
    api_instance = cdp.openapi_client.EndUserAccountsUnderDevelopmentApi(api_client)
    user_id = 'e051beeb-7163-4527-a5b6-35e301529ff2' # str | The ID of the end user to get.

    try:
        # Get an end user
        api_response = await api_instance.get_end_user(user_id)
        print("The response of EndUserAccountsUnderDevelopmentApi->get_end_user:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EndUserAccountsUnderDevelopmentApi->get_end_user: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **user_id** | **str**| The ID of the end user to get. | 

### Return type

[**EndUser**](EndUser.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully got end user. |  -  |
**404** | Not found. |  -  |
**500** | Internal server error. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

