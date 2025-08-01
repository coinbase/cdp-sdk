# cdp.openapi_client.EmbeddedWalletsUnderDevelopmentApi

All URIs are relative to *https://api.cdp.coinbase.com/platform*

Method | HTTP request | Description
------------- | ------------- | -------------
[**create_end_user_evm_account**](EmbeddedWalletsUnderDevelopmentApi.md#create_end_user_evm_account) | **POST** /v2/embedded-wallet-api/projects/{projectId}/end-users/{userId}/evm | Create end user EVM account
[**export_end_user_evm_account**](EmbeddedWalletsUnderDevelopmentApi.md#export_end_user_evm_account) | **POST** /v2/embedded-wallet-api/projects/{projectId}/end-users/{userId}/evm/export | Export end user EVM account
[**get_authenticated_end_user**](EmbeddedWalletsUnderDevelopmentApi.md#get_authenticated_end_user) | **GET** /v2/embedded-wallet-api/projects/{projectId}/end-users/{userId} | Get authenticated end user
[**initiate_authentication**](EmbeddedWalletsUnderDevelopmentApi.md#initiate_authentication) | **POST** /v2/embedded-wallet-api/projects/{projectId}/auth/init | Initiate end user authentication
[**log_out_end_user**](EmbeddedWalletsUnderDevelopmentApi.md#log_out_end_user) | **POST** /v2/embedded-wallet-api/projects/{projectId}/auth/logout | Log out end user
[**refresh_access_token**](EmbeddedWalletsUnderDevelopmentApi.md#refresh_access_token) | **POST** /v2/embedded-wallet-api/projects/{projectId}/auth/refresh | Refresh end user access token
[**register_temporary_wallet_secret**](EmbeddedWalletsUnderDevelopmentApi.md#register_temporary_wallet_secret) | **PUT** /v2/embedded-wallet-api/projects/{projectId}/end-users/{userId}/wallet-secrets | Register a Temporary Wallet Secret
[**send_evm_transaction_with_end_user_account**](EmbeddedWalletsUnderDevelopmentApi.md#send_evm_transaction_with_end_user_account) | **POST** /v2/embedded-wallet-api/projects/{projectId}/end-users/{userId}/evm/send/transaction | Send a transaction with end user EVM account
[**sign_evm_hash_with_end_user_account**](EmbeddedWalletsUnderDevelopmentApi.md#sign_evm_hash_with_end_user_account) | **POST** /v2/embedded-wallet-api/projects/{projectId}/end-users/{userId}/evm/sign | Sign a hash with end user EVM account
[**sign_evm_message_with_end_user_account**](EmbeddedWalletsUnderDevelopmentApi.md#sign_evm_message_with_end_user_account) | **POST** /v2/embedded-wallet-api/projects/{projectId}/end-users/{userId}/evm/sign/message | Sign an EIP-191 message with end user EVM account
[**sign_evm_transaction_with_end_user_account**](EmbeddedWalletsUnderDevelopmentApi.md#sign_evm_transaction_with_end_user_account) | **POST** /v2/embedded-wallet-api/projects/{projectId}/end-users/{userId}/evm/sign/transaction | Sign a transaction with end user EVM account
[**sign_evm_typed_data_with_end_user_account**](EmbeddedWalletsUnderDevelopmentApi.md#sign_evm_typed_data_with_end_user_account) | **POST** /v2/embedded-wallet-api/projects/{projectId}/end-users/{userId}/evm/sign/typed-data | Sign EIP-712 typed data with end user EVM account
[**verify_email_authentication**](EmbeddedWalletsUnderDevelopmentApi.md#verify_email_authentication) | **POST** /v2/embedded-wallet-api/projects/{projectId}/auth/verify/email | Verify end user email address
[**verify_sms_authentication**](EmbeddedWalletsUnderDevelopmentApi.md#verify_sms_authentication) | **POST** /v2/embedded-wallet-api/projects/{projectId}/auth/verify/sms | Verify end user phone number


# **create_end_user_evm_account**
> EndUser create_end_user_evm_account(project_id, user_id, x_idempotency_key=x_idempotency_key, x_wallet_auth=x_wallet_auth, create_end_user_evm_account_request=create_end_user_evm_account_request)

Create end user EVM account

Creates an EVM account for an end user. An end user can have a maximum of 20 EVM accounts.

### Example

* Bearer (JWT) Authentication (endUserAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.create_end_user_evm_account_request import CreateEndUserEvmAccountRequest
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

# Configure Bearer authorization (JWT): endUserAuth
configuration = cdp.openapi_client.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
async with cdp.openapi_client.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = cdp.openapi_client.EmbeddedWalletsUnderDevelopmentApi(api_client)
    project_id = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | The ID of the CDP Project.
    user_id = 'e051beeb-7163-4527-a5b6-35e301529ff2' # str | The ID of the end user.
    x_idempotency_key = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  (optional)
    x_wallet_auth = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywicm9sZSI6ImFkbWluIiwiZXhwIjoxNzAxOTgwMDAwfQ.HWvMTKmCCTxHaxjvZyLaC6UQ6TV3ErTDWBf7zmdH0Lw' # str | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  (optional)
    create_end_user_evm_account_request = cdp.openapi_client.CreateEndUserEvmAccountRequest() # CreateEndUserEvmAccountRequest |  (optional)

    try:
        # Create end user EVM account
        api_response = await api_instance.create_end_user_evm_account(project_id, user_id, x_idempotency_key=x_idempotency_key, x_wallet_auth=x_wallet_auth, create_end_user_evm_account_request=create_end_user_evm_account_request)
        print("The response of EmbeddedWalletsUnderDevelopmentApi->create_end_user_evm_account:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EmbeddedWalletsUnderDevelopmentApi->create_end_user_evm_account: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **project_id** | **str**| The ID of the CDP Project. | 
 **user_id** | **str**| The ID of the end user. | 
 **x_idempotency_key** | **str**| An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  | [optional] 
 **x_wallet_auth** | **str**| A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [optional] 
 **create_end_user_evm_account_request** | [**CreateEndUserEvmAccountRequest**](CreateEndUserEvmAccountRequest.md)|  | [optional] 

### Return type

[**EndUser**](EndUser.md)

### Authorization

[endUserAuth](../README.md#endUserAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully added EVM account. |  -  |
**400** | Invalid request. |  -  |
**401** | Unauthorized. |  -  |
**404** | End user not found. |  -  |
**429** | Maximum number of EVM accounts reached. |  -  |
**500** | Internal server error. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **export_end_user_evm_account**
> ExportEndUserEvmAccount200Response export_end_user_evm_account(project_id, user_id, x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, export_end_user_evm_account_request=export_end_user_evm_account_request)

Export end user EVM account

Export an existing end user EVM account's private key. It is important to store the private key in a secure place after it's exported.

### Example

* Bearer (JWT) Authentication (endUserAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.export_end_user_evm_account200_response import ExportEndUserEvmAccount200Response
from cdp.openapi_client.models.export_end_user_evm_account_request import ExportEndUserEvmAccountRequest
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

# Configure Bearer authorization (JWT): endUserAuth
configuration = cdp.openapi_client.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
async with cdp.openapi_client.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = cdp.openapi_client.EmbeddedWalletsUnderDevelopmentApi(api_client)
    project_id = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | The ID of the CDP Project.
    user_id = 'e051beeb-7163-4527-a5b6-35e301529ff2' # str | The ID of the end user.
    x_wallet_auth = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywicm9sZSI6ImFkbWluIiwiZXhwIjoxNzAxOTgwMDAwfQ.HWvMTKmCCTxHaxjvZyLaC6UQ6TV3ErTDWBf7zmdH0Lw' # str | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  (optional)
    x_idempotency_key = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  (optional)
    export_end_user_evm_account_request = cdp.openapi_client.ExportEndUserEvmAccountRequest() # ExportEndUserEvmAccountRequest |  (optional)

    try:
        # Export end user EVM account
        api_response = await api_instance.export_end_user_evm_account(project_id, user_id, x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, export_end_user_evm_account_request=export_end_user_evm_account_request)
        print("The response of EmbeddedWalletsUnderDevelopmentApi->export_end_user_evm_account:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EmbeddedWalletsUnderDevelopmentApi->export_end_user_evm_account: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **project_id** | **str**| The ID of the CDP Project. | 
 **user_id** | **str**| The ID of the end user. | 
 **x_wallet_auth** | **str**| A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [optional] 
 **x_idempotency_key** | **str**| An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  | [optional] 
 **export_end_user_evm_account_request** | [**ExportEndUserEvmAccountRequest**](ExportEndUserEvmAccountRequest.md)|  | [optional] 

### Return type

[**ExportEndUserEvmAccount200Response**](ExportEndUserEvmAccount200Response.md)

### Authorization

[endUserAuth](../README.md#endUserAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully exported EVM account. |  -  |
**400** | Invalid request. |  -  |
**401** | Unauthorized. |  -  |
**402** | A payment method is required to complete this operation. |  -  |
**404** | Not found. |  -  |
**422** | Idempotency key conflict. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_authenticated_end_user**
> EndUser get_authenticated_end_user(project_id, user_id)

Get authenticated end user

Gets the currently authenticated end user.

### Example

* Bearer (JWT) Authentication (endUserAuth):

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

# Configure Bearer authorization (JWT): endUserAuth
configuration = cdp.openapi_client.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
async with cdp.openapi_client.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = cdp.openapi_client.EmbeddedWalletsUnderDevelopmentApi(api_client)
    project_id = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | The ID of the CDP Project.
    user_id = 'e051beeb-7163-4527-a5b6-35e301529ff2' # str | The ID of the end user.

    try:
        # Get authenticated end user
        api_response = await api_instance.get_authenticated_end_user(project_id, user_id)
        print("The response of EmbeddedWalletsUnderDevelopmentApi->get_authenticated_end_user:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EmbeddedWalletsUnderDevelopmentApi->get_authenticated_end_user: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **project_id** | **str**| The ID of the CDP Project. | 
 **user_id** | **str**| The ID of the end user. | 

### Return type

[**EndUser**](EndUser.md)

### Authorization

[endUserAuth](../README.md#endUserAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully retrieved end user. |  -  |
**400** | Invalid request. |  -  |
**401** | Unauthorized. |  -  |
**404** | End user not found. |  -  |
**500** | Internal server error. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **initiate_authentication**
> InitiateAuthentication200Response initiate_authentication(project_id, x_idempotency_key=x_idempotency_key, initiate_authentication_request=initiate_authentication_request)

Initiate end user authentication

Initiates the authentication flow for an end user. This is an unauthenticated endpoint. The exact response depends on the authentication method specified in the request body.

### Example


```python
import cdp.openapi_client
from cdp.openapi_client.models.initiate_authentication200_response import InitiateAuthentication200Response
from cdp.openapi_client.models.initiate_authentication_request import InitiateAuthenticationRequest
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
    api_instance = cdp.openapi_client.EmbeddedWalletsUnderDevelopmentApi(api_client)
    project_id = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | The ID of the CDP Project.
    x_idempotency_key = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  (optional)
    initiate_authentication_request = cdp.openapi_client.InitiateAuthenticationRequest() # InitiateAuthenticationRequest |  (optional)

    try:
        # Initiate end user authentication
        api_response = await api_instance.initiate_authentication(project_id, x_idempotency_key=x_idempotency_key, initiate_authentication_request=initiate_authentication_request)
        print("The response of EmbeddedWalletsUnderDevelopmentApi->initiate_authentication:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EmbeddedWalletsUnderDevelopmentApi->initiate_authentication: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **project_id** | **str**| The ID of the CDP Project. | 
 **x_idempotency_key** | **str**| An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  | [optional] 
 **initiate_authentication_request** | [**InitiateAuthenticationRequest**](InitiateAuthenticationRequest.md)|  | [optional] 

### Return type

[**InitiateAuthentication200Response**](InitiateAuthentication200Response.md)

### Authorization

[unauthenticated](../README.md#unauthenticated)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully initiated authentication. |  -  |
**400** | Invalid request. |  -  |
**500** | Internal server error. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **log_out_end_user**
> log_out_end_user(cdp_refresh_token, project_id, x_idempotency_key=x_idempotency_key)

Log out end user

Logs out the end user using the attached refresh token.

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
    api_instance = cdp.openapi_client.EmbeddedWalletsUnderDevelopmentApi(api_client)
    cdp_refresh_token = 'asdfoiuxcv9243kcxc980' # str | The refresh token for the end user.
    project_id = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | The ID of the CDP Project.
    x_idempotency_key = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  (optional)

    try:
        # Log out end user
        await api_instance.log_out_end_user(cdp_refresh_token, project_id, x_idempotency_key=x_idempotency_key)
    except Exception as e:
        print("Exception when calling EmbeddedWalletsUnderDevelopmentApi->log_out_end_user: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **cdp_refresh_token** | **str**| The refresh token for the end user. | 
 **project_id** | **str**| The ID of the CDP Project. | 
 **x_idempotency_key** | **str**| An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  | [optional] 

### Return type

void (empty response body)

### Authorization

[unauthenticated](../README.md#unauthenticated)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully logged out end user. |  * Set-Cookie - The invalidated refresh token, indicating that the end user is no longer authenticated. <br>  |
**401** | Unauthorized. |  -  |
**500** | Internal server error. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **refresh_access_token**
> RefreshAccessToken200Response refresh_access_token(cdp_refresh_token, project_id, x_idempotency_key=x_idempotency_key, refresh_access_token_request=refresh_access_token_request)

Refresh end user access token

Refreshes the access token for the end user. This is an unauthenticated endpoint, but it assumes that the refresh token provided in the various `verify` endpoints is set in the `Cookie` header.

### Example


```python
import cdp.openapi_client
from cdp.openapi_client.models.refresh_access_token200_response import RefreshAccessToken200Response
from cdp.openapi_client.models.refresh_access_token_request import RefreshAccessTokenRequest
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
    api_instance = cdp.openapi_client.EmbeddedWalletsUnderDevelopmentApi(api_client)
    cdp_refresh_token = 'asdfoiuxcv9243kcxc980' # str | The refresh token for the end user.
    project_id = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | The ID of the CDP Project.
    x_idempotency_key = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  (optional)
    refresh_access_token_request = cdp.openapi_client.RefreshAccessTokenRequest() # RefreshAccessTokenRequest |  (optional)

    try:
        # Refresh end user access token
        api_response = await api_instance.refresh_access_token(cdp_refresh_token, project_id, x_idempotency_key=x_idempotency_key, refresh_access_token_request=refresh_access_token_request)
        print("The response of EmbeddedWalletsUnderDevelopmentApi->refresh_access_token:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EmbeddedWalletsUnderDevelopmentApi->refresh_access_token: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **cdp_refresh_token** | **str**| The refresh token for the end user. | 
 **project_id** | **str**| The ID of the CDP Project. | 
 **x_idempotency_key** | **str**| An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  | [optional] 
 **refresh_access_token_request** | [**RefreshAccessTokenRequest**](RefreshAccessTokenRequest.md)|  | [optional] 

### Return type

[**RefreshAccessToken200Response**](RefreshAccessToken200Response.md)

### Authorization

[unauthenticated](../README.md#unauthenticated)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully refreshed access token. |  * Set-Cookie - The refresh token for the end user. This token should be used to refresh the access token. <br>  |
**400** | Invalid request. |  -  |
**401** | Unauthorized. |  -  |
**500** | Internal server error. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **register_temporary_wallet_secret**
> RegisterTemporaryWalletSecret200Response register_temporary_wallet_secret(project_id, user_id, x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, x_developer_auth=x_developer_auth, register_temporary_wallet_secret_request=register_temporary_wallet_secret_request)

Register a Temporary Wallet Secret

Registers a Temporary Wallet Secret for a given end user. This secret is generated on the client-side by the end user's device/browser, typically with the CDP Embedded Wallet SDK, and is used to authenticate requests related to signing.   Temporary Wallet Secrets expire according to the provided TTL. A maximum of 5 Temporary Wallet Secrets can be registered at a given time for a specific end user. If the end user has more than 5 Temporary Wallet Secrets, the oldest one will be deleted to make space for the new one.  Temporary Wallet Secrets can be replaced by calling this API again with an already registered `walletSecretId`.   The following JavaScript code can be used to generate a Temporary Wallet Secret. The public key should be passed to this API.  ```javascript window.crypto.subtle.generateKey(   {     name: \"ECDSA\",     namedCurve: \"P-256\", // secp256r1   },   true, // Allow key export   [\"sign\", \"verify\"] // Key usages ).then(keyPair => {   return Promise.all([     window.crypto.subtle.exportKey(\"pkcs8\", keyPair.privateKey),     window.crypto.subtle.exportKey(\"spki\", keyPair.publicKey)   ]); }).then(([privateKeyBuffer, publicKeyBuffer]) => {   const privateKeyBytes = new Uint8Array(privateKeyBuffer);   const publicKeyBytes = new Uint8Array(publicKeyBuffer);    // Safe way to convert large Uint8Arrays to strings   const privateKeyBase64 = btoa(     Array.from(privateKeyBytes)       .map(byte => String.fromCharCode(byte))       .join('')   );    const publicKeyBase64 = btoa(     Array.from(publicKeyBytes)       .map(byte => String.fromCharCode(byte))       .join('')   );    console.log(privateKeyBase64);   console.log(publicKeyBase64);    return { privateKeyBase64, publicKeyBase64 }; });  ```   

### Example

* Bearer (JWT) Authentication (endUserAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.register_temporary_wallet_secret200_response import RegisterTemporaryWalletSecret200Response
from cdp.openapi_client.models.register_temporary_wallet_secret_request import RegisterTemporaryWalletSecretRequest
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

# Configure Bearer authorization (JWT): endUserAuth
configuration = cdp.openapi_client.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
async with cdp.openapi_client.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = cdp.openapi_client.EmbeddedWalletsUnderDevelopmentApi(api_client)
    project_id = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | The ID of the CDP Project.
    user_id = 'e051beeb-7163-4527-a5b6-35e301529ff2' # str | The ID of the end user.
    x_wallet_auth = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywicm9sZSI6ImFkbWluIiwiZXhwIjoxNzAxOTgwMDAwfQ.HWvMTKmCCTxHaxjvZyLaC6UQ6TV3ErTDWBf7zmdH0Lw' # str | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  (optional)
    x_idempotency_key = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  (optional)
    x_developer_auth = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywicm9sZSI6ImFkbWluIiwiZXhwIjoxNzAxOTgwMDAwfQ.HWvMTKmCCTxHaxjvZyLaC6UQ6TV3ErTDWBf7zmdH0Lw' # str | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  (optional)
    register_temporary_wallet_secret_request = cdp.openapi_client.RegisterTemporaryWalletSecretRequest() # RegisterTemporaryWalletSecretRequest |  (optional)

    try:
        # Register a Temporary Wallet Secret
        api_response = await api_instance.register_temporary_wallet_secret(project_id, user_id, x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, x_developer_auth=x_developer_auth, register_temporary_wallet_secret_request=register_temporary_wallet_secret_request)
        print("The response of EmbeddedWalletsUnderDevelopmentApi->register_temporary_wallet_secret:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EmbeddedWalletsUnderDevelopmentApi->register_temporary_wallet_secret: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **project_id** | **str**| The ID of the CDP Project. | 
 **user_id** | **str**| The ID of the end user. | 
 **x_wallet_auth** | **str**| A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [optional] 
 **x_idempotency_key** | **str**| An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  | [optional] 
 **x_developer_auth** | **str**| A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [optional] 
 **register_temporary_wallet_secret_request** | [**RegisterTemporaryWalletSecretRequest**](RegisterTemporaryWalletSecretRequest.md)|  | [optional] 

### Return type

[**RegisterTemporaryWalletSecret200Response**](RegisterTemporaryWalletSecret200Response.md)

### Authorization

[endUserAuth](../README.md#endUserAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully registered Temporary Wallet Secret. |  -  |
**400** | Invalid request. |  -  |
**401** | Unauthorized. |  -  |
**404** | Not found. |  -  |
**500** | Internal server error. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **send_evm_transaction_with_end_user_account**
> SendEvmTransactionWithEndUserAccount200Response send_evm_transaction_with_end_user_account(project_id, user_id, x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, send_evm_transaction_with_end_user_account_request=send_evm_transaction_with_end_user_account_request)

Send a transaction with end user EVM account

Signs a transaction with the given end userEVM account and sends it to the indicated supported network. This API handles nonce management and gas estimation, leaving the developer to provide only the minimal set of fields necessary to send the transaction. The transaction should be serialized as a hex string using [RLP](https://ethereum.org/en/developers/docs/data-structures-and-encoding/rlp/).  The transaction must be an [EIP-1559 dynamic fee transaction](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1559.md).   **Transaction fields and API behavior**  - `to` *(Required)*: The address of the contract or account to send the transaction to. - `chainId` *(Ignored)*: The value of the `chainId` field in the transaction is ignored.   The transaction will be sent to the network indicated by the `network` field in the request body.  - `nonce` *(Optional)*: The nonce to use for the transaction. If not provided, the API will assign    a nonce to the transaction based on the current state of the account.  - `maxPriorityFeePerGas` *(Optional)*: The maximum priority fee per gas to use for the transaction.    If not provided, the API will estimate a value based on current network conditions.  - `maxFeePerGas` *(Optional)*: The maximum fee per gas to use for the transaction.    If not provided, the API will estimate a value based on current network conditions.  - `gasLimit` *(Optional)*: The gas limit to use for the transaction. If not provided, the API will estimate a value   based on the `to` and `data` fields of the transaction.  - `value` *(Optional)*: The amount of ETH, in wei, to send with the transaction. - `data` *(Optional)*: The data to send with the transaction; only used for contract calls. - `accessList` *(Optional)*: The access list to use for the transaction.

### Example

* Bearer (JWT) Authentication (endUserAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.send_evm_transaction_with_end_user_account200_response import SendEvmTransactionWithEndUserAccount200Response
from cdp.openapi_client.models.send_evm_transaction_with_end_user_account_request import SendEvmTransactionWithEndUserAccountRequest
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

# Configure Bearer authorization (JWT): endUserAuth
configuration = cdp.openapi_client.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
async with cdp.openapi_client.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = cdp.openapi_client.EmbeddedWalletsUnderDevelopmentApi(api_client)
    project_id = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | The ID of the CDP Project.
    user_id = 'e051beeb-7163-4527-a5b6-35e301529ff2' # str | The ID of the end user.
    x_wallet_auth = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywicm9sZSI6ImFkbWluIiwiZXhwIjoxNzAxOTgwMDAwfQ.HWvMTKmCCTxHaxjvZyLaC6UQ6TV3ErTDWBf7zmdH0Lw' # str | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  (optional)
    x_idempotency_key = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  (optional)
    send_evm_transaction_with_end_user_account_request = cdp.openapi_client.SendEvmTransactionWithEndUserAccountRequest() # SendEvmTransactionWithEndUserAccountRequest |  (optional)

    try:
        # Send a transaction with end user EVM account
        api_response = await api_instance.send_evm_transaction_with_end_user_account(project_id, user_id, x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, send_evm_transaction_with_end_user_account_request=send_evm_transaction_with_end_user_account_request)
        print("The response of EmbeddedWalletsUnderDevelopmentApi->send_evm_transaction_with_end_user_account:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EmbeddedWalletsUnderDevelopmentApi->send_evm_transaction_with_end_user_account: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **project_id** | **str**| The ID of the CDP Project. | 
 **user_id** | **str**| The ID of the end user. | 
 **x_wallet_auth** | **str**| A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [optional] 
 **x_idempotency_key** | **str**| An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  | [optional] 
 **send_evm_transaction_with_end_user_account_request** | [**SendEvmTransactionWithEndUserAccountRequest**](SendEvmTransactionWithEndUserAccountRequest.md)|  | [optional] 

### Return type

[**SendEvmTransactionWithEndUserAccount200Response**](SendEvmTransactionWithEndUserAccount200Response.md)

### Authorization

[endUserAuth](../README.md#endUserAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully signed and sent transaction. |  -  |
**400** | Invalid request. |  -  |
**401** | Unauthorized. |  -  |
**402** | A payment method is required to complete this operation. |  -  |
**403** | Access to resource forbidden. |  -  |
**404** | Not found. |  -  |
**409** | The resource already exists. |  -  |
**422** | Idempotency key conflict. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **sign_evm_hash_with_end_user_account**
> SignEvmHashWithEndUserAccount200Response sign_evm_hash_with_end_user_account(project_id, user_id, x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, x_developer_auth=x_developer_auth, sign_evm_hash_with_end_user_account_request=sign_evm_hash_with_end_user_account_request)

Sign a hash with end user EVM account

Signs an arbitrary 32 byte hash with the end user's given EVM account.

### Example

* Bearer (JWT) Authentication (endUserAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.sign_evm_hash_with_end_user_account200_response import SignEvmHashWithEndUserAccount200Response
from cdp.openapi_client.models.sign_evm_hash_with_end_user_account_request import SignEvmHashWithEndUserAccountRequest
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

# Configure Bearer authorization (JWT): endUserAuth
configuration = cdp.openapi_client.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
async with cdp.openapi_client.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = cdp.openapi_client.EmbeddedWalletsUnderDevelopmentApi(api_client)
    project_id = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | The ID of the CDP Project.
    user_id = 'e051beeb-7163-4527-a5b6-35e301529ff2' # str | The ID of the end user.
    x_wallet_auth = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywicm9sZSI6ImFkbWluIiwiZXhwIjoxNzAxOTgwMDAwfQ.HWvMTKmCCTxHaxjvZyLaC6UQ6TV3ErTDWBf7zmdH0Lw' # str | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  (optional)
    x_idempotency_key = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  (optional)
    x_developer_auth = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywicm9sZSI6ImFkbWluIiwiZXhwIjoxNzAxOTgwMDAwfQ.HWvMTKmCCTxHaxjvZyLaC6UQ6TV3ErTDWBf7zmdH0Lw' # str | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  (optional)
    sign_evm_hash_with_end_user_account_request = cdp.openapi_client.SignEvmHashWithEndUserAccountRequest() # SignEvmHashWithEndUserAccountRequest |  (optional)

    try:
        # Sign a hash with end user EVM account
        api_response = await api_instance.sign_evm_hash_with_end_user_account(project_id, user_id, x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, x_developer_auth=x_developer_auth, sign_evm_hash_with_end_user_account_request=sign_evm_hash_with_end_user_account_request)
        print("The response of EmbeddedWalletsUnderDevelopmentApi->sign_evm_hash_with_end_user_account:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EmbeddedWalletsUnderDevelopmentApi->sign_evm_hash_with_end_user_account: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **project_id** | **str**| The ID of the CDP Project. | 
 **user_id** | **str**| The ID of the end user. | 
 **x_wallet_auth** | **str**| A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [optional] 
 **x_idempotency_key** | **str**| An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  | [optional] 
 **x_developer_auth** | **str**| A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [optional] 
 **sign_evm_hash_with_end_user_account_request** | [**SignEvmHashWithEndUserAccountRequest**](SignEvmHashWithEndUserAccountRequest.md)|  | [optional] 

### Return type

[**SignEvmHashWithEndUserAccount200Response**](SignEvmHashWithEndUserAccount200Response.md)

### Authorization

[endUserAuth](../README.md#endUserAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully signed hash. |  -  |
**400** | Invalid request. |  -  |
**401** | Unauthorized. |  -  |
**404** | Not found. |  -  |
**409** | The resource already exists. |  -  |
**422** | Idempotency key conflict. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **sign_evm_message_with_end_user_account**
> SignEvmMessageWithEndUserAccount200Response sign_evm_message_with_end_user_account(project_id, user_id, x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, sign_evm_message_with_end_user_account_request=sign_evm_message_with_end_user_account_request)

Sign an EIP-191 message with end user EVM account

Signs an [EIP-191](https://eips.ethereum.org/EIPS/eip-191) message with the given end user EVM account.  Per the specification, the message in the request body is prepended with `0x19 <0x45 (E)> <thereum Signed Message:\\n\" + len(message)>` before being signed.

### Example

* Bearer (JWT) Authentication (endUserAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.sign_evm_message_with_end_user_account200_response import SignEvmMessageWithEndUserAccount200Response
from cdp.openapi_client.models.sign_evm_message_with_end_user_account_request import SignEvmMessageWithEndUserAccountRequest
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

# Configure Bearer authorization (JWT): endUserAuth
configuration = cdp.openapi_client.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
async with cdp.openapi_client.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = cdp.openapi_client.EmbeddedWalletsUnderDevelopmentApi(api_client)
    project_id = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | The ID of the CDP Project.
    user_id = 'e051beeb-7163-4527-a5b6-35e301529ff2' # str | The ID of the end user.
    x_wallet_auth = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywicm9sZSI6ImFkbWluIiwiZXhwIjoxNzAxOTgwMDAwfQ.HWvMTKmCCTxHaxjvZyLaC6UQ6TV3ErTDWBf7zmdH0Lw' # str | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  (optional)
    x_idempotency_key = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  (optional)
    sign_evm_message_with_end_user_account_request = cdp.openapi_client.SignEvmMessageWithEndUserAccountRequest() # SignEvmMessageWithEndUserAccountRequest |  (optional)

    try:
        # Sign an EIP-191 message with end user EVM account
        api_response = await api_instance.sign_evm_message_with_end_user_account(project_id, user_id, x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, sign_evm_message_with_end_user_account_request=sign_evm_message_with_end_user_account_request)
        print("The response of EmbeddedWalletsUnderDevelopmentApi->sign_evm_message_with_end_user_account:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EmbeddedWalletsUnderDevelopmentApi->sign_evm_message_with_end_user_account: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **project_id** | **str**| The ID of the CDP Project. | 
 **user_id** | **str**| The ID of the end user. | 
 **x_wallet_auth** | **str**| A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [optional] 
 **x_idempotency_key** | **str**| An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  | [optional] 
 **sign_evm_message_with_end_user_account_request** | [**SignEvmMessageWithEndUserAccountRequest**](SignEvmMessageWithEndUserAccountRequest.md)|  | [optional] 

### Return type

[**SignEvmMessageWithEndUserAccount200Response**](SignEvmMessageWithEndUserAccount200Response.md)

### Authorization

[endUserAuth](../README.md#endUserAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully signed message. |  -  |
**401** | Unauthorized. |  -  |
**402** | A payment method is required to complete this operation. |  -  |
**404** | Not found. |  -  |
**409** | The resource already exists. |  -  |
**422** | Idempotency key conflict. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **sign_evm_transaction_with_end_user_account**
> SignEvmTransactionWithEndUserAccount200Response sign_evm_transaction_with_end_user_account(project_id, user_id, x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, sign_evm_transaction_with_end_user_account_request=sign_evm_transaction_with_end_user_account_request)

Sign a transaction with end user EVM account

Signs a transaction with the given end user EVM account. The transaction should be serialized as a hex string using [RLP](https://ethereum.org/en/developers/docs/data-structures-and-encoding/rlp/).  The transaction must be an [EIP-1559 dynamic fee transaction](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1559.md). The developer is responsible for ensuring that the unsigned transaction is valid, as the API will not validate the transaction.

### Example

* Bearer (JWT) Authentication (endUserAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.sign_evm_transaction_with_end_user_account200_response import SignEvmTransactionWithEndUserAccount200Response
from cdp.openapi_client.models.sign_evm_transaction_with_end_user_account_request import SignEvmTransactionWithEndUserAccountRequest
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

# Configure Bearer authorization (JWT): endUserAuth
configuration = cdp.openapi_client.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
async with cdp.openapi_client.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = cdp.openapi_client.EmbeddedWalletsUnderDevelopmentApi(api_client)
    project_id = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | The ID of the CDP Project.
    user_id = 'e051beeb-7163-4527-a5b6-35e301529ff2' # str | The ID of the end user.
    x_wallet_auth = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywicm9sZSI6ImFkbWluIiwiZXhwIjoxNzAxOTgwMDAwfQ.HWvMTKmCCTxHaxjvZyLaC6UQ6TV3ErTDWBf7zmdH0Lw' # str | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  (optional)
    x_idempotency_key = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  (optional)
    sign_evm_transaction_with_end_user_account_request = cdp.openapi_client.SignEvmTransactionWithEndUserAccountRequest() # SignEvmTransactionWithEndUserAccountRequest |  (optional)

    try:
        # Sign a transaction with end user EVM account
        api_response = await api_instance.sign_evm_transaction_with_end_user_account(project_id, user_id, x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, sign_evm_transaction_with_end_user_account_request=sign_evm_transaction_with_end_user_account_request)
        print("The response of EmbeddedWalletsUnderDevelopmentApi->sign_evm_transaction_with_end_user_account:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EmbeddedWalletsUnderDevelopmentApi->sign_evm_transaction_with_end_user_account: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **project_id** | **str**| The ID of the CDP Project. | 
 **user_id** | **str**| The ID of the end user. | 
 **x_wallet_auth** | **str**| A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [optional] 
 **x_idempotency_key** | **str**| An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  | [optional] 
 **sign_evm_transaction_with_end_user_account_request** | [**SignEvmTransactionWithEndUserAccountRequest**](SignEvmTransactionWithEndUserAccountRequest.md)|  | [optional] 

### Return type

[**SignEvmTransactionWithEndUserAccount200Response**](SignEvmTransactionWithEndUserAccount200Response.md)

### Authorization

[endUserAuth](../README.md#endUserAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully signed transaction. |  -  |
**400** | Invalid request. |  -  |
**401** | Unauthorized. |  -  |
**402** | A payment method is required to complete this operation. |  -  |
**403** | Access to resource forbidden. |  -  |
**404** | Not found. |  -  |
**409** | The resource already exists. |  -  |
**422** | Idempotency key conflict. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **sign_evm_typed_data_with_end_user_account**
> SignEvmTypedDataWithEndUserAccount200Response sign_evm_typed_data_with_end_user_account(project_id, user_id, x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, sign_evm_typed_data_with_end_user_account_request=sign_evm_typed_data_with_end_user_account_request)

Sign EIP-712 typed data with end user EVM account

Signs [EIP-712](https://eips.ethereum.org/EIPS/eip-712) typed data with the given end user EVM account.

### Example

* Bearer (JWT) Authentication (endUserAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.sign_evm_typed_data_with_end_user_account200_response import SignEvmTypedDataWithEndUserAccount200Response
from cdp.openapi_client.models.sign_evm_typed_data_with_end_user_account_request import SignEvmTypedDataWithEndUserAccountRequest
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

# Configure Bearer authorization (JWT): endUserAuth
configuration = cdp.openapi_client.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
async with cdp.openapi_client.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = cdp.openapi_client.EmbeddedWalletsUnderDevelopmentApi(api_client)
    project_id = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | The ID of the CDP Project.
    user_id = 'e051beeb-7163-4527-a5b6-35e301529ff2' # str | The ID of the end user.
    x_wallet_auth = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywicm9sZSI6ImFkbWluIiwiZXhwIjoxNzAxOTgwMDAwfQ.HWvMTKmCCTxHaxjvZyLaC6UQ6TV3ErTDWBf7zmdH0Lw' # str | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  (optional)
    x_idempotency_key = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  (optional)
    sign_evm_typed_data_with_end_user_account_request = cdp.openapi_client.SignEvmTypedDataWithEndUserAccountRequest() # SignEvmTypedDataWithEndUserAccountRequest |  (optional)

    try:
        # Sign EIP-712 typed data with end user EVM account
        api_response = await api_instance.sign_evm_typed_data_with_end_user_account(project_id, user_id, x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, sign_evm_typed_data_with_end_user_account_request=sign_evm_typed_data_with_end_user_account_request)
        print("The response of EmbeddedWalletsUnderDevelopmentApi->sign_evm_typed_data_with_end_user_account:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EmbeddedWalletsUnderDevelopmentApi->sign_evm_typed_data_with_end_user_account: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **project_id** | **str**| The ID of the CDP Project. | 
 **user_id** | **str**| The ID of the end user. | 
 **x_wallet_auth** | **str**| A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [optional] 
 **x_idempotency_key** | **str**| An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  | [optional] 
 **sign_evm_typed_data_with_end_user_account_request** | [**SignEvmTypedDataWithEndUserAccountRequest**](SignEvmTypedDataWithEndUserAccountRequest.md)|  | [optional] 

### Return type

[**SignEvmTypedDataWithEndUserAccount200Response**](SignEvmTypedDataWithEndUserAccount200Response.md)

### Authorization

[endUserAuth](../README.md#endUserAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully signed typed data. |  -  |
**400** | Invalid request. |  -  |
**401** | Unauthorized. |  -  |
**402** | A payment method is required to complete this operation. |  -  |
**404** | Not found. |  -  |
**422** | Idempotency key conflict. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **verify_email_authentication**
> VerifyEmailAuthentication200Response verify_email_authentication(project_id, x_idempotency_key=x_idempotency_key, verify_email_authentication_request=verify_email_authentication_request)

Verify end user email address

Verifies the end user's email address using a one-time password. This is an unauthenticated endpoint. The API returns an access token that can be used to authenticate subsequent requests to the Embedded Wallet APIs, as well as a refresh token set in the `Set-Cookie` header.

### Example


```python
import cdp.openapi_client
from cdp.openapi_client.models.verify_email_authentication200_response import VerifyEmailAuthentication200Response
from cdp.openapi_client.models.verify_email_authentication_request import VerifyEmailAuthenticationRequest
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
    api_instance = cdp.openapi_client.EmbeddedWalletsUnderDevelopmentApi(api_client)
    project_id = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | The ID of the CDP Project.
    x_idempotency_key = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  (optional)
    verify_email_authentication_request = cdp.openapi_client.VerifyEmailAuthenticationRequest() # VerifyEmailAuthenticationRequest |  (optional)

    try:
        # Verify end user email address
        api_response = await api_instance.verify_email_authentication(project_id, x_idempotency_key=x_idempotency_key, verify_email_authentication_request=verify_email_authentication_request)
        print("The response of EmbeddedWalletsUnderDevelopmentApi->verify_email_authentication:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EmbeddedWalletsUnderDevelopmentApi->verify_email_authentication: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **project_id** | **str**| The ID of the CDP Project. | 
 **x_idempotency_key** | **str**| An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  | [optional] 
 **verify_email_authentication_request** | [**VerifyEmailAuthenticationRequest**](VerifyEmailAuthenticationRequest.md)|  | [optional] 

### Return type

[**VerifyEmailAuthentication200Response**](VerifyEmailAuthentication200Response.md)

### Authorization

[unauthenticated](../README.md#unauthenticated)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully verified email address. |  * Set-Cookie - The refresh token for the end user. This token should be used to refresh the access token. <br>  |
**400** | Invalid request. |  -  |
**401** | Unauthorized. |  -  |
**404** | Authentication flow not found. |  -  |
**500** | Internal server error. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **verify_sms_authentication**
> VerifySmsAuthentication200Response verify_sms_authentication(project_id, x_idempotency_key=x_idempotency_key, verify_sms_authentication_request=verify_sms_authentication_request)

Verify end user phone number

Verifies the end user's phone number using a one-time password sent via SMS. This is an unauthenticated endpoint. The API returns an access token that can be used to authenticate subsequent requests to the Embedded Wallet APIs, as well as a refresh token set in the `Set-Cookie` header.

### Example


```python
import cdp.openapi_client
from cdp.openapi_client.models.verify_sms_authentication200_response import VerifySmsAuthentication200Response
from cdp.openapi_client.models.verify_sms_authentication_request import VerifySmsAuthenticationRequest
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
    api_instance = cdp.openapi_client.EmbeddedWalletsUnderDevelopmentApi(api_client)
    project_id = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | The ID of the CDP Project.
    x_idempotency_key = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  (optional)
    verify_sms_authentication_request = cdp.openapi_client.VerifySmsAuthenticationRequest() # VerifySmsAuthenticationRequest |  (optional)

    try:
        # Verify end user phone number
        api_response = await api_instance.verify_sms_authentication(project_id, x_idempotency_key=x_idempotency_key, verify_sms_authentication_request=verify_sms_authentication_request)
        print("The response of EmbeddedWalletsUnderDevelopmentApi->verify_sms_authentication:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EmbeddedWalletsUnderDevelopmentApi->verify_sms_authentication: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **project_id** | **str**| The ID of the CDP Project. | 
 **x_idempotency_key** | **str**| An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  | [optional] 
 **verify_sms_authentication_request** | [**VerifySmsAuthenticationRequest**](VerifySmsAuthenticationRequest.md)|  | [optional] 

### Return type

[**VerifySmsAuthentication200Response**](VerifySmsAuthentication200Response.md)

### Authorization

[unauthenticated](../README.md#unauthenticated)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully verified phone number. |  * Set-Cookie - The refresh token for the end user. This token should be used to refresh the access token. <br>  |
**400** | Invalid request. |  -  |
**401** | Unauthorized. |  -  |
**404** | Authentication flow not found. |  -  |
**500** | Internal server error. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

