# cdp.openapi_client.EVMAccountsApi

All URIs are relative to *https://api.cdp.coinbase.com/platform*

Method | HTTP request | Description
------------- | ------------- | -------------
[**create_evm_account**](EVMAccountsApi.md#create_evm_account) | **POST** /v2/evm/accounts | Create an EVM account
[**export_evm_account**](EVMAccountsApi.md#export_evm_account) | **POST** /v2/evm/accounts/{address}/export | Export an EVM account
[**export_evm_account_by_name**](EVMAccountsApi.md#export_evm_account_by_name) | **POST** /v2/evm/accounts/export/by-name/{name} | Export an EVM account by name
[**get_evm_account**](EVMAccountsApi.md#get_evm_account) | **GET** /v2/evm/accounts/{address} | Get an EVM account by address
[**get_evm_account_by_name**](EVMAccountsApi.md#get_evm_account_by_name) | **GET** /v2/evm/accounts/by-name/{name} | Get an EVM account by name
[**import_evm_account**](EVMAccountsApi.md#import_evm_account) | **POST** /v2/evm/accounts/import | Import an EVM account
[**list_evm_accounts**](EVMAccountsApi.md#list_evm_accounts) | **GET** /v2/evm/accounts | List EVM accounts
[**send_evm_transaction**](EVMAccountsApi.md#send_evm_transaction) | **POST** /v2/evm/accounts/{address}/send/transaction | Send a transaction
[**sign_evm_hash**](EVMAccountsApi.md#sign_evm_hash) | **POST** /v2/evm/accounts/{address}/sign | Sign a hash
[**sign_evm_message**](EVMAccountsApi.md#sign_evm_message) | **POST** /v2/evm/accounts/{address}/sign/message | Sign an EIP-191 message
[**sign_evm_transaction**](EVMAccountsApi.md#sign_evm_transaction) | **POST** /v2/evm/accounts/{address}/sign/transaction | Sign a transaction
[**sign_evm_typed_data**](EVMAccountsApi.md#sign_evm_typed_data) | **POST** /v2/evm/accounts/{address}/sign/typed-data | Sign EIP-712 typed data
[**update_evm_account**](EVMAccountsApi.md#update_evm_account) | **PUT** /v2/evm/accounts/{address} | Update an EVM account
[**update_evm_account_policy**](EVMAccountsApi.md#update_evm_account_policy) | **PUT** /v2/evm/accounts/{address}/policy | Update an EVM account&#39;s policy
[**update_evm_smart_account_policy**](EVMAccountsApi.md#update_evm_smart_account_policy) | **PUT** /v2/evm/smart-accounts/{address}/policy | Update an EVM Smart Account&#39;s policy


# **create_evm_account**
> EvmAccount create_evm_account(x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, create_evm_account_request=create_evm_account_request)

Create an EVM account

Creates a new EVM account.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.create_evm_account_request import CreateEvmAccountRequest
from cdp.openapi_client.models.evm_account import EvmAccount
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
    api_instance = cdp.openapi_client.EVMAccountsApi(api_client)
    x_wallet_auth = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywicm9sZSI6ImFkbWluIiwiZXhwIjoxNzAxOTgwMDAwfQ.HWvMTKmCCTxHaxjvZyLaC6UQ6TV3ErTDWBf7zmdH0Lw' # str | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  (optional)
    x_idempotency_key = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  (optional)
    create_evm_account_request = cdp.openapi_client.CreateEvmAccountRequest() # CreateEvmAccountRequest |  (optional)

    try:
        # Create an EVM account
        api_response = await api_instance.create_evm_account(x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, create_evm_account_request=create_evm_account_request)
        print("The response of EVMAccountsApi->create_evm_account:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EVMAccountsApi->create_evm_account: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **x_wallet_auth** | **str**| A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [optional] 
 **x_idempotency_key** | **str**| An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  | [optional] 
 **create_evm_account_request** | [**CreateEvmAccountRequest**](CreateEvmAccountRequest.md)|  | [optional] 

### Return type

[**EvmAccount**](EvmAccount.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**201** | Successfully created EVM account. |  -  |
**400** | Invalid request. |  -  |
**401** | Unauthorized. |  -  |
**402** | A payment method is required to complete this operation. |  -  |
**409** | Resource already exists. |  -  |
**422** | Idempotency key conflict. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **export_evm_account**
> ExportEndUserEvmAccount200Response export_evm_account(address, x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, export_evm_account_request=export_evm_account_request)

Export an EVM account

Export an existing EVM account's private key. It is important to store the private key in a secure place after it's exported.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.export_end_user_evm_account200_response import ExportEndUserEvmAccount200Response
from cdp.openapi_client.models.export_evm_account_request import ExportEvmAccountRequest
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
    api_instance = cdp.openapi_client.EVMAccountsApi(api_client)
    address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' # str | The 0x-prefixed address of the EVM account. The address does not need to be checksummed.
    x_wallet_auth = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywicm9sZSI6ImFkbWluIiwiZXhwIjoxNzAxOTgwMDAwfQ.HWvMTKmCCTxHaxjvZyLaC6UQ6TV3ErTDWBf7zmdH0Lw' # str | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  (optional)
    x_idempotency_key = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  (optional)
    export_evm_account_request = cdp.openapi_client.ExportEvmAccountRequest() # ExportEvmAccountRequest |  (optional)

    try:
        # Export an EVM account
        api_response = await api_instance.export_evm_account(address, x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, export_evm_account_request=export_evm_account_request)
        print("The response of EVMAccountsApi->export_evm_account:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EVMAccountsApi->export_evm_account: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **address** | **str**| The 0x-prefixed address of the EVM account. The address does not need to be checksummed. | 
 **x_wallet_auth** | **str**| A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [optional] 
 **x_idempotency_key** | **str**| An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  | [optional] 
 **export_evm_account_request** | [**ExportEvmAccountRequest**](ExportEvmAccountRequest.md)|  | [optional] 

### Return type

[**ExportEndUserEvmAccount200Response**](ExportEndUserEvmAccount200Response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

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

# **export_evm_account_by_name**
> ExportEndUserEvmAccount200Response export_evm_account_by_name(name, x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, export_evm_account_request=export_evm_account_request)

Export an EVM account by name

Export an existing EVM account's private key by its name. It is important to store the private key in a secure place after it's exported.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.export_end_user_evm_account200_response import ExportEndUserEvmAccount200Response
from cdp.openapi_client.models.export_evm_account_request import ExportEvmAccountRequest
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
    api_instance = cdp.openapi_client.EVMAccountsApi(api_client)
    name = 'my-account' # str | The name of the EVM account.
    x_wallet_auth = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywicm9sZSI6ImFkbWluIiwiZXhwIjoxNzAxOTgwMDAwfQ.HWvMTKmCCTxHaxjvZyLaC6UQ6TV3ErTDWBf7zmdH0Lw' # str | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  (optional)
    x_idempotency_key = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  (optional)
    export_evm_account_request = cdp.openapi_client.ExportEvmAccountRequest() # ExportEvmAccountRequest |  (optional)

    try:
        # Export an EVM account by name
        api_response = await api_instance.export_evm_account_by_name(name, x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, export_evm_account_request=export_evm_account_request)
        print("The response of EVMAccountsApi->export_evm_account_by_name:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EVMAccountsApi->export_evm_account_by_name: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **name** | **str**| The name of the EVM account. | 
 **x_wallet_auth** | **str**| A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [optional] 
 **x_idempotency_key** | **str**| An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  | [optional] 
 **export_evm_account_request** | [**ExportEvmAccountRequest**](ExportEvmAccountRequest.md)|  | [optional] 

### Return type

[**ExportEndUserEvmAccount200Response**](ExportEndUserEvmAccount200Response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

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

# **get_evm_account**
> EvmAccount get_evm_account(address)

Get an EVM account by address

Gets an EVM account by its address.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.evm_account import EvmAccount
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
    api_instance = cdp.openapi_client.EVMAccountsApi(api_client)
    address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' # str | The 0x-prefixed address of the EVM account. The address does not need to be checksummed.

    try:
        # Get an EVM account by address
        api_response = await api_instance.get_evm_account(address)
        print("The response of EVMAccountsApi->get_evm_account:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EVMAccountsApi->get_evm_account: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **address** | **str**| The 0x-prefixed address of the EVM account. The address does not need to be checksummed. | 

### Return type

[**EvmAccount**](EvmAccount.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth), [sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully got EVM account. |  -  |
**400** | Invalid request. |  -  |
**404** | Not found. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_evm_account_by_name**
> EvmAccount get_evm_account_by_name(name)

Get an EVM account by name

Gets an EVM account by its name.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.evm_account import EvmAccount
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
    api_instance = cdp.openapi_client.EVMAccountsApi(api_client)
    name = 'my-account' # str | The name of the EVM account.

    try:
        # Get an EVM account by name
        api_response = await api_instance.get_evm_account_by_name(name)
        print("The response of EVMAccountsApi->get_evm_account_by_name:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EVMAccountsApi->get_evm_account_by_name: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **name** | **str**| The name of the EVM account. | 

### Return type

[**EvmAccount**](EvmAccount.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth), [sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully got EVM account. |  -  |
**400** | Invalid request. |  -  |
**404** | Not found. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **import_evm_account**
> EvmAccount import_evm_account(x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, import_evm_account_request=import_evm_account_request)

Import an EVM account

Import an existing EVM account into the developer's CDP Project. This API should be called from the [CDP SDK](https://github.com/coinbase/cdp-sdk) to ensure that the associated private key is properly encrypted.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.evm_account import EvmAccount
from cdp.openapi_client.models.import_evm_account_request import ImportEvmAccountRequest
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
    api_instance = cdp.openapi_client.EVMAccountsApi(api_client)
    x_wallet_auth = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywicm9sZSI6ImFkbWluIiwiZXhwIjoxNzAxOTgwMDAwfQ.HWvMTKmCCTxHaxjvZyLaC6UQ6TV3ErTDWBf7zmdH0Lw' # str | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  (optional)
    x_idempotency_key = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  (optional)
    import_evm_account_request = cdp.openapi_client.ImportEvmAccountRequest() # ImportEvmAccountRequest |  (optional)

    try:
        # Import an EVM account
        api_response = await api_instance.import_evm_account(x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, import_evm_account_request=import_evm_account_request)
        print("The response of EVMAccountsApi->import_evm_account:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EVMAccountsApi->import_evm_account: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **x_wallet_auth** | **str**| A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [optional] 
 **x_idempotency_key** | **str**| An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  | [optional] 
 **import_evm_account_request** | [**ImportEvmAccountRequest**](ImportEvmAccountRequest.md)|  | [optional] 

### Return type

[**EvmAccount**](EvmAccount.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**201** | Successfully imported EVM account. |  -  |
**400** | Invalid request. |  -  |
**401** | Unauthorized. |  -  |
**402** | A payment method is required to complete this operation. |  -  |
**409** | Resource already exists. |  -  |
**422** | Idempotency key conflict. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **list_evm_accounts**
> ListEvmAccounts200Response list_evm_accounts(page_size=page_size, page_token=page_token)

List EVM accounts

Lists the EVM accounts belonging to the developer's CDP Project. The response is paginated, and by default, returns 20 accounts per page.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.list_evm_accounts200_response import ListEvmAccounts200Response
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
    api_instance = cdp.openapi_client.EVMAccountsApi(api_client)
    page_size = 20 # int | The number of accounts to return per page. (optional) (default to 20)
    page_token = 'eyJsYXN0X2lkIjogImFiYzEyMyIsICJ0aW1lc3RhbXAiOiAxNzA3ODIzNzAxfQ==' # str | The token for the next page of accounts, if any. (optional)

    try:
        # List EVM accounts
        api_response = await api_instance.list_evm_accounts(page_size=page_size, page_token=page_token)
        print("The response of EVMAccountsApi->list_evm_accounts:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EVMAccountsApi->list_evm_accounts: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **page_size** | **int**| The number of accounts to return per page. | [optional] [default to 20]
 **page_token** | **str**| The token for the next page of accounts, if any. | [optional] 

### Return type

[**ListEvmAccounts200Response**](ListEvmAccounts200Response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth), [sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully listed EVM accounts. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **send_evm_transaction**
> SendEvmTransactionWithEndUserAccount200Response send_evm_transaction(address, x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, send_evm_transaction_request=send_evm_transaction_request)

Send a transaction

Signs a transaction with the given EVM account and sends it to the indicated supported network. This API handles nonce management and gas estimation, leaving the developer to provide only the minimal set of fields necessary to send the transaction. The transaction should be serialized as a hex string using [RLP](https://ethereum.org/en/developers/docs/data-structures-and-encoding/rlp/).  The transaction must be an [EIP-1559 dynamic fee transaction](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1559.md).   **Transaction fields and API behavior**  - `to` *(Required)*: The address of the contract or account to send the transaction to. - `chainId` *(Ignored)*: The value of the `chainId` field in the transaction is ignored.   The transaction will be sent to the network indicated by the `network` field in the request body.  - `nonce` *(Optional)*: The nonce to use for the transaction. If not provided, the API will assign    a nonce to the transaction based on the current state of the account.  - `maxPriorityFeePerGas` *(Optional)*: The maximum priority fee per gas to use for the transaction.    If not provided, the API will estimate a value based on current network conditions.  - `maxFeePerGas` *(Optional)*: The maximum fee per gas to use for the transaction.    If not provided, the API will estimate a value based on current network conditions.  - `gasLimit` *(Optional)*: The gas limit to use for the transaction. If not provided, the API will estimate a value   based on the `to` and `data` fields of the transaction.  - `value` *(Optional)*: The amount of ETH, in wei, to send with the transaction. - `data` *(Optional)*: The data to send with the transaction; only used for contract calls. - `accessList` *(Optional)*: The access list to use for the transaction.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.send_evm_transaction_request import SendEvmTransactionRequest
from cdp.openapi_client.models.send_evm_transaction_with_end_user_account200_response import SendEvmTransactionWithEndUserAccount200Response
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
    api_instance = cdp.openapi_client.EVMAccountsApi(api_client)
    address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' # str | The 0x-prefixed address of the Ethereum account.
    x_wallet_auth = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywicm9sZSI6ImFkbWluIiwiZXhwIjoxNzAxOTgwMDAwfQ.HWvMTKmCCTxHaxjvZyLaC6UQ6TV3ErTDWBf7zmdH0Lw' # str | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  (optional)
    x_idempotency_key = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  (optional)
    send_evm_transaction_request = cdp.openapi_client.SendEvmTransactionRequest() # SendEvmTransactionRequest |  (optional)

    try:
        # Send a transaction
        api_response = await api_instance.send_evm_transaction(address, x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, send_evm_transaction_request=send_evm_transaction_request)
        print("The response of EVMAccountsApi->send_evm_transaction:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EVMAccountsApi->send_evm_transaction: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **address** | **str**| The 0x-prefixed address of the Ethereum account. | 
 **x_wallet_auth** | **str**| A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [optional] 
 **x_idempotency_key** | **str**| An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  | [optional] 
 **send_evm_transaction_request** | [**SendEvmTransactionRequest**](SendEvmTransactionRequest.md)|  | [optional] 

### Return type

[**SendEvmTransactionWithEndUserAccount200Response**](SendEvmTransactionWithEndUserAccount200Response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

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

# **sign_evm_hash**
> SignEvmHashWithEndUserAccount200Response sign_evm_hash(address, x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, sign_evm_hash_request=sign_evm_hash_request)

Sign a hash

Signs an arbitrary 32 byte hash with the given EVM account.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.sign_evm_hash_request import SignEvmHashRequest
from cdp.openapi_client.models.sign_evm_hash_with_end_user_account200_response import SignEvmHashWithEndUserAccount200Response
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
    api_instance = cdp.openapi_client.EVMAccountsApi(api_client)
    address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' # str | The 0x-prefixed address of the EVM account.
    x_wallet_auth = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywicm9sZSI6ImFkbWluIiwiZXhwIjoxNzAxOTgwMDAwfQ.HWvMTKmCCTxHaxjvZyLaC6UQ6TV3ErTDWBf7zmdH0Lw' # str | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  (optional)
    x_idempotency_key = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  (optional)
    sign_evm_hash_request = cdp.openapi_client.SignEvmHashRequest() # SignEvmHashRequest |  (optional)

    try:
        # Sign a hash
        api_response = await api_instance.sign_evm_hash(address, x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, sign_evm_hash_request=sign_evm_hash_request)
        print("The response of EVMAccountsApi->sign_evm_hash:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EVMAccountsApi->sign_evm_hash: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **address** | **str**| The 0x-prefixed address of the EVM account. | 
 **x_wallet_auth** | **str**| A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [optional] 
 **x_idempotency_key** | **str**| An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  | [optional] 
 **sign_evm_hash_request** | [**SignEvmHashRequest**](SignEvmHashRequest.md)|  | [optional] 

### Return type

[**SignEvmHashWithEndUserAccount200Response**](SignEvmHashWithEndUserAccount200Response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully signed hash. |  -  |
**400** | Invalid request. |  -  |
**402** | A payment method is required to complete this operation. |  -  |
**404** | Not found. |  -  |
**409** | The resource already exists. |  -  |
**422** | Idempotency key conflict. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **sign_evm_message**
> SignEvmMessageWithEndUserAccount200Response sign_evm_message(address, x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, sign_evm_message_request=sign_evm_message_request)

Sign an EIP-191 message

Signs an [EIP-191](https://eips.ethereum.org/EIPS/eip-191) message with the given EVM account.  Per the specification, the message in the request body is prepended with `0x19 <0x45 (E)> <thereum Signed Message:\\n\" + len(message)>` before being signed.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.sign_evm_message_request import SignEvmMessageRequest
from cdp.openapi_client.models.sign_evm_message_with_end_user_account200_response import SignEvmMessageWithEndUserAccount200Response
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
    api_instance = cdp.openapi_client.EVMAccountsApi(api_client)
    address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' # str | The 0x-prefixed address of the EVM account.
    x_wallet_auth = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywicm9sZSI6ImFkbWluIiwiZXhwIjoxNzAxOTgwMDAwfQ.HWvMTKmCCTxHaxjvZyLaC6UQ6TV3ErTDWBf7zmdH0Lw' # str | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  (optional)
    x_idempotency_key = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  (optional)
    sign_evm_message_request = cdp.openapi_client.SignEvmMessageRequest() # SignEvmMessageRequest |  (optional)

    try:
        # Sign an EIP-191 message
        api_response = await api_instance.sign_evm_message(address, x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, sign_evm_message_request=sign_evm_message_request)
        print("The response of EVMAccountsApi->sign_evm_message:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EVMAccountsApi->sign_evm_message: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **address** | **str**| The 0x-prefixed address of the EVM account. | 
 **x_wallet_auth** | **str**| A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [optional] 
 **x_idempotency_key** | **str**| An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  | [optional] 
 **sign_evm_message_request** | [**SignEvmMessageRequest**](SignEvmMessageRequest.md)|  | [optional] 

### Return type

[**SignEvmMessageWithEndUserAccount200Response**](SignEvmMessageWithEndUserAccount200Response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

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

# **sign_evm_transaction**
> SignEvmTransactionWithEndUserAccount200Response sign_evm_transaction(address, x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, sign_evm_transaction_request=sign_evm_transaction_request)

Sign a transaction

Signs a transaction with the given EVM account. The transaction should be serialized as a hex string using [RLP](https://ethereum.org/en/developers/docs/data-structures-and-encoding/rlp/).  The transaction must be an [EIP-1559 dynamic fee transaction](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1559.md). The developer is responsible for ensuring that the unsigned transaction is valid, as the API will not validate the transaction.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.sign_evm_transaction_request import SignEvmTransactionRequest
from cdp.openapi_client.models.sign_evm_transaction_with_end_user_account200_response import SignEvmTransactionWithEndUserAccount200Response
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
    api_instance = cdp.openapi_client.EVMAccountsApi(api_client)
    address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' # str | The 0x-prefixed address of the EVM account.
    x_wallet_auth = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywicm9sZSI6ImFkbWluIiwiZXhwIjoxNzAxOTgwMDAwfQ.HWvMTKmCCTxHaxjvZyLaC6UQ6TV3ErTDWBf7zmdH0Lw' # str | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  (optional)
    x_idempotency_key = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  (optional)
    sign_evm_transaction_request = cdp.openapi_client.SignEvmTransactionRequest() # SignEvmTransactionRequest |  (optional)

    try:
        # Sign a transaction
        api_response = await api_instance.sign_evm_transaction(address, x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, sign_evm_transaction_request=sign_evm_transaction_request)
        print("The response of EVMAccountsApi->sign_evm_transaction:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EVMAccountsApi->sign_evm_transaction: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **address** | **str**| The 0x-prefixed address of the EVM account. | 
 **x_wallet_auth** | **str**| A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [optional] 
 **x_idempotency_key** | **str**| An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  | [optional] 
 **sign_evm_transaction_request** | [**SignEvmTransactionRequest**](SignEvmTransactionRequest.md)|  | [optional] 

### Return type

[**SignEvmTransactionWithEndUserAccount200Response**](SignEvmTransactionWithEndUserAccount200Response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

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

# **sign_evm_typed_data**
> SignEvmTypedDataWithEndUserAccount200Response sign_evm_typed_data(address, x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, eip712_message=eip712_message)

Sign EIP-712 typed data

Signs [EIP-712](https://eips.ethereum.org/EIPS/eip-712) typed data with the given EVM account.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.eip712_message import EIP712Message
from cdp.openapi_client.models.sign_evm_typed_data_with_end_user_account200_response import SignEvmTypedDataWithEndUserAccount200Response
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
    api_instance = cdp.openapi_client.EVMAccountsApi(api_client)
    address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' # str | The 0x-prefixed address of the EVM account.
    x_wallet_auth = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywicm9sZSI6ImFkbWluIiwiZXhwIjoxNzAxOTgwMDAwfQ.HWvMTKmCCTxHaxjvZyLaC6UQ6TV3ErTDWBf7zmdH0Lw' # str | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  (optional)
    x_idempotency_key = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  (optional)
    eip712_message = cdp.openapi_client.EIP712Message() # EIP712Message |  (optional)

    try:
        # Sign EIP-712 typed data
        api_response = await api_instance.sign_evm_typed_data(address, x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, eip712_message=eip712_message)
        print("The response of EVMAccountsApi->sign_evm_typed_data:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EVMAccountsApi->sign_evm_typed_data: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **address** | **str**| The 0x-prefixed address of the EVM account. | 
 **x_wallet_auth** | **str**| A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [optional] 
 **x_idempotency_key** | **str**| An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  | [optional] 
 **eip712_message** | [**EIP712Message**](EIP712Message.md)|  | [optional] 

### Return type

[**SignEvmTypedDataWithEndUserAccount200Response**](SignEvmTypedDataWithEndUserAccount200Response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

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

# **update_evm_account**
> EvmAccount update_evm_account(address, x_idempotency_key=x_idempotency_key, update_evm_account_request=update_evm_account_request)

Update an EVM account

Updates an existing EVM account. Use this to update the account's name or account-level policy.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.evm_account import EvmAccount
from cdp.openapi_client.models.update_evm_account_request import UpdateEvmAccountRequest
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
    api_instance = cdp.openapi_client.EVMAccountsApi(api_client)
    address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' # str | The 0x-prefixed address of the EVM account. The address does not need to be checksummed.
    x_idempotency_key = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  (optional)
    update_evm_account_request = cdp.openapi_client.UpdateEvmAccountRequest() # UpdateEvmAccountRequest |  (optional)

    try:
        # Update an EVM account
        api_response = await api_instance.update_evm_account(address, x_idempotency_key=x_idempotency_key, update_evm_account_request=update_evm_account_request)
        print("The response of EVMAccountsApi->update_evm_account:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EVMAccountsApi->update_evm_account: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **address** | **str**| The 0x-prefixed address of the EVM account. The address does not need to be checksummed. | 
 **x_idempotency_key** | **str**| An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  | [optional] 
 **update_evm_account_request** | [**UpdateEvmAccountRequest**](UpdateEvmAccountRequest.md)|  | [optional] 

### Return type

[**EvmAccount**](EvmAccount.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth), [sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully updated EVM account. |  -  |
**400** | Invalid request. |  -  |
**404** | EVM account not found. |  -  |
**409** | The resource already exists. |  -  |
**422** | Idempotency key conflict. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **update_evm_account_policy**
> EvmAccount update_evm_account_policy(address, x_idempotency_key=x_idempotency_key, update_evm_account_policy_request=update_evm_account_policy_request)

Update an EVM account's policy

Updates an existing EVM account's policy.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.evm_account import EvmAccount
from cdp.openapi_client.models.update_evm_account_policy_request import UpdateEvmAccountPolicyRequest
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
    api_instance = cdp.openapi_client.EVMAccountsApi(api_client)
    address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' # str | The 0x-prefixed address of the EVM account. The address does not need to be checksummed.
    x_idempotency_key = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  (optional)
    update_evm_account_policy_request = cdp.openapi_client.UpdateEvmAccountPolicyRequest() # UpdateEvmAccountPolicyRequest |  (optional)

    try:
        # Update an EVM account's policy
        api_response = await api_instance.update_evm_account_policy(address, x_idempotency_key=x_idempotency_key, update_evm_account_policy_request=update_evm_account_policy_request)
        print("The response of EVMAccountsApi->update_evm_account_policy:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EVMAccountsApi->update_evm_account_policy: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **address** | **str**| The 0x-prefixed address of the EVM account. The address does not need to be checksummed. | 
 **x_idempotency_key** | **str**| An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  | [optional] 
 **update_evm_account_policy_request** | [**UpdateEvmAccountPolicyRequest**](UpdateEvmAccountPolicyRequest.md)|  | [optional] 

### Return type

[**EvmAccount**](EvmAccount.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth), [sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully updated EVM account. |  -  |
**400** | Invalid request. |  -  |
**404** | EVM account not found. |  -  |
**409** | The resource already exists. |  -  |
**422** | Idempotency key conflict. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **update_evm_smart_account_policy**
> EvmSmartAccount update_evm_smart_account_policy(address, x_idempotency_key=x_idempotency_key, update_evm_smart_account_policy_request=update_evm_smart_account_policy_request)

Update an EVM Smart Account's policy

Updates an existing EVM Smart Account's policy.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.evm_smart_account import EvmSmartAccount
from cdp.openapi_client.models.update_evm_smart_account_policy_request import UpdateEvmSmartAccountPolicyRequest
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
    api_instance = cdp.openapi_client.EVMAccountsApi(api_client)
    address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' # str | The 0x-prefixed address of the Smart Account. The address does not need to be checksummed.
    x_idempotency_key = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  (optional)
    update_evm_smart_account_policy_request = cdp.openapi_client.UpdateEvmSmartAccountPolicyRequest() # UpdateEvmSmartAccountPolicyRequest |  (optional)

    try:
        # Update an EVM Smart Account's policy
        api_response = await api_instance.update_evm_smart_account_policy(address, x_idempotency_key=x_idempotency_key, update_evm_smart_account_policy_request=update_evm_smart_account_policy_request)
        print("The response of EVMAccountsApi->update_evm_smart_account_policy:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EVMAccountsApi->update_evm_smart_account_policy: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **address** | **str**| The 0x-prefixed address of the Smart Account. The address does not need to be checksummed. | 
 **x_idempotency_key** | **str**| An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  | [optional] 
 **update_evm_smart_account_policy_request** | [**UpdateEvmSmartAccountPolicyRequest**](UpdateEvmSmartAccountPolicyRequest.md)|  | [optional] 

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
**200** | Successfully updated EVM Smart Account. |  -  |
**400** | Invalid request. |  -  |
**404** | EVM Smart Account not found. |  -  |
**409** | The resource already exists. |  -  |
**422** | Idempotency key conflict. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

