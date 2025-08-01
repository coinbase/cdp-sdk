# cdp.openapi_client.EVMSmartAccountsApi

All URIs are relative to *https://api.cdp.coinbase.com/platform*

Method | HTTP request | Description
------------- | ------------- | -------------
[**create_evm_smart_account**](EVMSmartAccountsApi.md#create_evm_smart_account) | **POST** /v2/evm/smart-accounts | Create a Smart Account
[**create_spend_permission**](EVMSmartAccountsApi.md#create_spend_permission) | **POST** /v2/evm/smart-accounts/{address}/spend-permissions | Create a spend permission
[**get_evm_smart_account**](EVMSmartAccountsApi.md#get_evm_smart_account) | **GET** /v2/evm/smart-accounts/{address} | Get a Smart Account by address
[**get_evm_smart_account_by_name**](EVMSmartAccountsApi.md#get_evm_smart_account_by_name) | **GET** /v2/evm/smart-accounts/by-name/{name} | Get a Smart Account by name
[**get_user_operation**](EVMSmartAccountsApi.md#get_user_operation) | **GET** /v2/evm/smart-accounts/{address}/user-operations/{userOpHash} | Get a user operation
[**list_evm_smart_accounts**](EVMSmartAccountsApi.md#list_evm_smart_accounts) | **GET** /v2/evm/smart-accounts | List Smart Accounts
[**prepare_user_operation**](EVMSmartAccountsApi.md#prepare_user_operation) | **POST** /v2/evm/smart-accounts/{address}/user-operations | Prepare a user operation
[**revoke_spend_permission**](EVMSmartAccountsApi.md#revoke_spend_permission) | **POST** /v2/evm/smart-accounts/{address}/spend-permissions/revoke | Revoke a spend permission
[**send_user_operation**](EVMSmartAccountsApi.md#send_user_operation) | **POST** /v2/evm/smart-accounts/{address}/user-operations/{userOpHash}/send | Send a user operation
[**update_evm_smart_account**](EVMSmartAccountsApi.md#update_evm_smart_account) | **PUT** /v2/evm/smart-accounts/{address} | Update an EVM Smart Account


# **create_evm_smart_account**
> EvmSmartAccount create_evm_smart_account(x_idempotency_key=x_idempotency_key, create_evm_smart_account_request=create_evm_smart_account_request)

Create a Smart Account

Creates a new Smart Account.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.create_evm_smart_account_request import CreateEvmSmartAccountRequest
from cdp.openapi_client.models.evm_smart_account import EvmSmartAccount
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
    api_instance = cdp.openapi_client.EVMSmartAccountsApi(api_client)
    x_idempotency_key = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  (optional)
    create_evm_smart_account_request = cdp.openapi_client.CreateEvmSmartAccountRequest() # CreateEvmSmartAccountRequest |  (optional)

    try:
        # Create a Smart Account
        api_response = await api_instance.create_evm_smart_account(x_idempotency_key=x_idempotency_key, create_evm_smart_account_request=create_evm_smart_account_request)
        print("The response of EVMSmartAccountsApi->create_evm_smart_account:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EVMSmartAccountsApi->create_evm_smart_account: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **x_idempotency_key** | **str**| An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  | [optional] 
 **create_evm_smart_account_request** | [**CreateEvmSmartAccountRequest**](CreateEvmSmartAccountRequest.md)|  | [optional] 

### Return type

[**EvmSmartAccount**](EvmSmartAccount.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**201** | Successfully created Smart Account. |  -  |
**400** | Invalid request. |  -  |
**402** | A payment method is required to complete this operation. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **create_spend_permission**
> EvmUserOperation create_spend_permission(address, create_spend_permission_request, x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key)

Create a spend permission

Creates a spend permission for the given smart account address.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.create_spend_permission_request import CreateSpendPermissionRequest
from cdp.openapi_client.models.evm_user_operation import EvmUserOperation
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
    api_instance = cdp.openapi_client.EVMSmartAccountsApi(api_client)
    address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' # str | The address of the Smart Account to create the spend permission for.
    create_spend_permission_request = cdp.openapi_client.CreateSpendPermissionRequest() # CreateSpendPermissionRequest | 
    x_wallet_auth = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywicm9sZSI6ImFkbWluIiwiZXhwIjoxNzAxOTgwMDAwfQ.HWvMTKmCCTxHaxjvZyLaC6UQ6TV3ErTDWBf7zmdH0Lw' # str | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  (optional)
    x_idempotency_key = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  (optional)

    try:
        # Create a spend permission
        api_response = await api_instance.create_spend_permission(address, create_spend_permission_request, x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key)
        print("The response of EVMSmartAccountsApi->create_spend_permission:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EVMSmartAccountsApi->create_spend_permission: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **address** | **str**| The address of the Smart Account to create the spend permission for. | 
 **create_spend_permission_request** | [**CreateSpendPermissionRequest**](CreateSpendPermissionRequest.md)|  | 
 **x_wallet_auth** | **str**| A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [optional] 
 **x_idempotency_key** | **str**| An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  | [optional] 

### Return type

[**EvmUserOperation**](EvmUserOperation.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully created spend permission. |  -  |
**400** | Invalid request. |  -  |
**404** | Not found. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_evm_smart_account**
> EvmSmartAccount get_evm_smart_account(address)

Get a Smart Account by address

Gets a Smart Account by its address.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.evm_smart_account import EvmSmartAccount
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
    api_instance = cdp.openapi_client.EVMSmartAccountsApi(api_client)
    address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' # str | The 0x-prefixed address of the Smart Account.

    try:
        # Get a Smart Account by address
        api_response = await api_instance.get_evm_smart_account(address)
        print("The response of EVMSmartAccountsApi->get_evm_smart_account:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EVMSmartAccountsApi->get_evm_smart_account: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **address** | **str**| The 0x-prefixed address of the Smart Account. | 

### Return type

[**EvmSmartAccount**](EvmSmartAccount.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth), [sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully got Smart Account. |  -  |
**400** | Invalid request. |  -  |
**404** | Not found. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_evm_smart_account_by_name**
> EvmSmartAccount get_evm_smart_account_by_name(name)

Get a Smart Account by name

Gets a Smart Account by its name.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.evm_smart_account import EvmSmartAccount
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
    api_instance = cdp.openapi_client.EVMSmartAccountsApi(api_client)
    name = 'my-account' # str | The name of the Smart Account.

    try:
        # Get a Smart Account by name
        api_response = await api_instance.get_evm_smart_account_by_name(name)
        print("The response of EVMSmartAccountsApi->get_evm_smart_account_by_name:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EVMSmartAccountsApi->get_evm_smart_account_by_name: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **name** | **str**| The name of the Smart Account. | 

### Return type

[**EvmSmartAccount**](EvmSmartAccount.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth), [sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully got Smart Account. |  -  |
**400** | Invalid request. |  -  |
**404** | Not found. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_user_operation**
> EvmUserOperation get_user_operation(address, user_op_hash)

Get a user operation

Gets a user operation by its hash.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.evm_user_operation import EvmUserOperation
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
    api_instance = cdp.openapi_client.EVMSmartAccountsApi(api_client)
    address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' # str | The address of the Smart Account the user operation belongs to.
    user_op_hash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' # str | The hash of the user operation to fetch.

    try:
        # Get a user operation
        api_response = await api_instance.get_user_operation(address, user_op_hash)
        print("The response of EVMSmartAccountsApi->get_user_operation:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EVMSmartAccountsApi->get_user_operation: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **address** | **str**| The address of the Smart Account the user operation belongs to. | 
 **user_op_hash** | **str**| The hash of the user operation to fetch. | 

### Return type

[**EvmUserOperation**](EvmUserOperation.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth), [sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully retrieved the user operation. |  -  |
**400** | Invalid request. |  -  |
**404** | Not found. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **list_evm_smart_accounts**
> ListEvmSmartAccounts200Response list_evm_smart_accounts(page_size=page_size, page_token=page_token)

List Smart Accounts

Lists the Smart Accounts belonging to the developer's CDP Project. The response is paginated, and by default, returns 20 accounts per page.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.list_evm_smart_accounts200_response import ListEvmSmartAccounts200Response
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
    api_instance = cdp.openapi_client.EVMSmartAccountsApi(api_client)
    page_size = 20 # int | The number of accounts to return per page. (optional) (default to 20)
    page_token = 'eyJsYXN0X2lkIjogImFiYzEyMyIsICJ0aW1lc3RhbXAiOiAxNzA3ODIzNzAxfQ==' # str | The token for the next page of accounts, if any. (optional)

    try:
        # List Smart Accounts
        api_response = await api_instance.list_evm_smart_accounts(page_size=page_size, page_token=page_token)
        print("The response of EVMSmartAccountsApi->list_evm_smart_accounts:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EVMSmartAccountsApi->list_evm_smart_accounts: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **page_size** | **int**| The number of accounts to return per page. | [optional] [default to 20]
 **page_token** | **str**| The token for the next page of accounts, if any. | [optional] 

### Return type

[**ListEvmSmartAccounts200Response**](ListEvmSmartAccounts200Response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth), [sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully listed Smart Accounts. |  -  |
**400** | Invalid request. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **prepare_user_operation**
> EvmUserOperation prepare_user_operation(address, prepare_user_operation_request=prepare_user_operation_request)

Prepare a user operation

Prepares a new user operation on a Smart Account for a specific network.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.evm_user_operation import EvmUserOperation
from cdp.openapi_client.models.prepare_user_operation_request import PrepareUserOperationRequest
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
    api_instance = cdp.openapi_client.EVMSmartAccountsApi(api_client)
    address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' # str | The address of the Smart Account to create the user operation on.
    prepare_user_operation_request = cdp.openapi_client.PrepareUserOperationRequest() # PrepareUserOperationRequest |  (optional)

    try:
        # Prepare a user operation
        api_response = await api_instance.prepare_user_operation(address, prepare_user_operation_request=prepare_user_operation_request)
        print("The response of EVMSmartAccountsApi->prepare_user_operation:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EVMSmartAccountsApi->prepare_user_operation: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **address** | **str**| The address of the Smart Account to create the user operation on. | 
 **prepare_user_operation_request** | [**PrepareUserOperationRequest**](PrepareUserOperationRequest.md)|  | [optional] 

### Return type

[**EvmUserOperation**](EvmUserOperation.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**201** | The prepared user operation. |  -  |
**400** | Invalid request. |  -  |
**403** | Access to resource forbidden. |  -  |
**404** | Not found. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **revoke_spend_permission**
> EvmUserOperation revoke_spend_permission(address, revoke_spend_permission_request, x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key)

Revoke a spend permission

Revokes an existing spend permission.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.evm_user_operation import EvmUserOperation
from cdp.openapi_client.models.revoke_spend_permission_request import RevokeSpendPermissionRequest
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
    api_instance = cdp.openapi_client.EVMSmartAccountsApi(api_client)
    address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' # str | The address of the Smart account this spend permission is valid for.
    revoke_spend_permission_request = cdp.openapi_client.RevokeSpendPermissionRequest() # RevokeSpendPermissionRequest | 
    x_wallet_auth = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywicm9sZSI6ImFkbWluIiwiZXhwIjoxNzAxOTgwMDAwfQ.HWvMTKmCCTxHaxjvZyLaC6UQ6TV3ErTDWBf7zmdH0Lw' # str | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  (optional)
    x_idempotency_key = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  (optional)

    try:
        # Revoke a spend permission
        api_response = await api_instance.revoke_spend_permission(address, revoke_spend_permission_request, x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key)
        print("The response of EVMSmartAccountsApi->revoke_spend_permission:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EVMSmartAccountsApi->revoke_spend_permission: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **address** | **str**| The address of the Smart account this spend permission is valid for. | 
 **revoke_spend_permission_request** | [**RevokeSpendPermissionRequest**](RevokeSpendPermissionRequest.md)|  | 
 **x_wallet_auth** | **str**| A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [optional] 
 **x_idempotency_key** | **str**| An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  | [optional] 

### Return type

[**EvmUserOperation**](EvmUserOperation.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully revoked spend permission. |  -  |
**400** | Invalid request. |  -  |
**404** | Not found. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **send_user_operation**
> EvmUserOperation send_user_operation(address, user_op_hash, send_user_operation_request=send_user_operation_request)

Send a user operation

Sends a user operation with a signature. The payload to sign must be the `userOpHash` field of the user operation. This hash should be signed directly (not using `personal_sign` or EIP-191 message hashing). The signature must be 65 bytes in length, consisting of: - 32 bytes for the `r` value - 32 bytes for the `s` value - 1 byte for the `v` value (must be 27 or 28) If using the CDP Paymaster, the user operation must be signed and sent within 2 minutes of being prepared.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.evm_user_operation import EvmUserOperation
from cdp.openapi_client.models.send_user_operation_request import SendUserOperationRequest
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
    api_instance = cdp.openapi_client.EVMSmartAccountsApi(api_client)
    address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' # str | The address of the Smart Account to send the user operation from.
    user_op_hash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' # str | The hash of the user operation to send.
    send_user_operation_request = cdp.openapi_client.SendUserOperationRequest() # SendUserOperationRequest |  (optional)

    try:
        # Send a user operation
        api_response = await api_instance.send_user_operation(address, user_op_hash, send_user_operation_request=send_user_operation_request)
        print("The response of EVMSmartAccountsApi->send_user_operation:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EVMSmartAccountsApi->send_user_operation: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **address** | **str**| The address of the Smart Account to send the user operation from. | 
 **user_op_hash** | **str**| The hash of the user operation to send. | 
 **send_user_operation_request** | [**SendUserOperationRequest**](SendUserOperationRequest.md)|  | [optional] 

### Return type

[**EvmUserOperation**](EvmUserOperation.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | The sent user operation. |  -  |
**400** | Invalid request. |  -  |
**402** | A payment method is required to complete this operation. |  -  |
**403** | Access to resource forbidden. |  -  |
**404** | Not found. |  -  |
**429** | Rate limit exceeded. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **update_evm_smart_account**
> EvmSmartAccount update_evm_smart_account(address, update_evm_smart_account_request=update_evm_smart_account_request)

Update an EVM Smart Account

Updates an existing EVM smart account. Use this to update the smart account's name.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.evm_smart_account import EvmSmartAccount
from cdp.openapi_client.models.update_evm_smart_account_request import UpdateEvmSmartAccountRequest
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
    api_instance = cdp.openapi_client.EVMSmartAccountsApi(api_client)
    address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' # str | The 0x-prefixed address of the EVM smart account. The address does not need to be checksummed.
    update_evm_smart_account_request = cdp.openapi_client.UpdateEvmSmartAccountRequest() # UpdateEvmSmartAccountRequest |  (optional)

    try:
        # Update an EVM Smart Account
        api_response = await api_instance.update_evm_smart_account(address, update_evm_smart_account_request=update_evm_smart_account_request)
        print("The response of EVMSmartAccountsApi->update_evm_smart_account:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EVMSmartAccountsApi->update_evm_smart_account: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **address** | **str**| The 0x-prefixed address of the EVM smart account. The address does not need to be checksummed. | 
 **update_evm_smart_account_request** | [**UpdateEvmSmartAccountRequest**](UpdateEvmSmartAccountRequest.md)|  | [optional] 

### Return type

[**EvmSmartAccount**](EvmSmartAccount.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth), [sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully updated EVM smart account. |  -  |
**400** | Invalid request. |  -  |
**404** | EVM account not found. |  -  |
**409** | The resource already exists. |  -  |
**422** | Idempotency key conflict. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

