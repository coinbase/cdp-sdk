# cdp.openapi_client.SolanaAccountsApi

All URIs are relative to *https://api.cdp.coinbase.com/platform*

Method | HTTP request | Description
------------- | ------------- | -------------
[**create_solana_account**](SolanaAccountsApi.md#create_solana_account) | **POST** /v2/solana/accounts | Create a Solana account
[**export_solana_account**](SolanaAccountsApi.md#export_solana_account) | **POST** /v2/solana/accounts/{address}/export | Export an Solana account
[**export_solana_account_by_name**](SolanaAccountsApi.md#export_solana_account_by_name) | **POST** /v2/solana/accounts/export/by-name/{name} | Export a Solana account by name
[**get_solana_account**](SolanaAccountsApi.md#get_solana_account) | **GET** /v2/solana/accounts/{address} | Get a Solana account by address
[**get_solana_account_by_name**](SolanaAccountsApi.md#get_solana_account_by_name) | **GET** /v2/solana/accounts/by-name/{name} | Get a Solana account by name
[**import_solana_account**](SolanaAccountsApi.md#import_solana_account) | **POST** /v2/solana/accounts/import | Import a Solana account
[**list_solana_accounts**](SolanaAccountsApi.md#list_solana_accounts) | **GET** /v2/solana/accounts | List Solana accounts or get account by name
[**send_solana_transaction**](SolanaAccountsApi.md#send_solana_transaction) | **POST** /v2/solana/accounts/send/transaction | Send a Solana transaction
[**sign_solana_message**](SolanaAccountsApi.md#sign_solana_message) | **POST** /v2/solana/accounts/{address}/sign/message | Sign a message
[**sign_solana_transaction**](SolanaAccountsApi.md#sign_solana_transaction) | **POST** /v2/solana/accounts/{address}/sign/transaction | Sign a transaction
[**update_solana_account**](SolanaAccountsApi.md#update_solana_account) | **PUT** /v2/solana/accounts/{address} | Update a Solana account
[**update_solana_account_policy**](SolanaAccountsApi.md#update_solana_account_policy) | **PUT** /v2/solana/accounts/{address}/policy | Update a Solana account&#39;s policy


# **create_solana_account**
> SolanaAccount create_solana_account(x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, create_solana_account_request=create_solana_account_request)

Create a Solana account

Creates a new Solana account.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.create_solana_account_request import CreateSolanaAccountRequest
from cdp.openapi_client.models.solana_account import SolanaAccount
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
    api_instance = cdp.openapi_client.SolanaAccountsApi(api_client)
    x_wallet_auth = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywicm9sZSI6ImFkbWluIiwiZXhwIjoxNzAxOTgwMDAwfQ.HWvMTKmCCTxHaxjvZyLaC6UQ6TV3ErTDWBf7zmdH0Lw' # str | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  (optional)
    x_idempotency_key = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  (optional)
    create_solana_account_request = cdp.openapi_client.CreateSolanaAccountRequest() # CreateSolanaAccountRequest |  (optional)

    try:
        # Create a Solana account
        api_response = await api_instance.create_solana_account(x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, create_solana_account_request=create_solana_account_request)
        print("The response of SolanaAccountsApi->create_solana_account:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling SolanaAccountsApi->create_solana_account: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **x_wallet_auth** | **str**| A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [optional] 
 **x_idempotency_key** | **str**| An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  | [optional] 
 **create_solana_account_request** | [**CreateSolanaAccountRequest**](CreateSolanaAccountRequest.md)|  | [optional] 

### Return type

[**SolanaAccount**](SolanaAccount.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**201** | Successfully created Solana account. |  -  |
**400** | Invalid request. |  -  |
**401** | Unauthorized. |  -  |
**402** | A payment method is required to complete this operation. |  -  |
**409** | Resource already exists. |  -  |
**422** | Idempotency key conflict. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **export_solana_account**
> ExportSolanaAccount200Response export_solana_account(address, x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, export_evm_account_request=export_evm_account_request)

Export an Solana account

Export an existing Solana account's private key. It is important to store the private key in a secure place after it's exported.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.export_evm_account_request import ExportEvmAccountRequest
from cdp.openapi_client.models.export_solana_account200_response import ExportSolanaAccount200Response
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
    api_instance = cdp.openapi_client.SolanaAccountsApi(api_client)
    address = 'HpabPRRCFbBKSuJr5PdkVvQc85FyxyTWkFM2obBRSvHT' # str | The base58 encoded address of the Solana account.
    x_wallet_auth = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywicm9sZSI6ImFkbWluIiwiZXhwIjoxNzAxOTgwMDAwfQ.HWvMTKmCCTxHaxjvZyLaC6UQ6TV3ErTDWBf7zmdH0Lw' # str | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  (optional)
    x_idempotency_key = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  (optional)
    export_evm_account_request = cdp.openapi_client.ExportEvmAccountRequest() # ExportEvmAccountRequest |  (optional)

    try:
        # Export an Solana account
        api_response = await api_instance.export_solana_account(address, x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, export_evm_account_request=export_evm_account_request)
        print("The response of SolanaAccountsApi->export_solana_account:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling SolanaAccountsApi->export_solana_account: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **address** | **str**| The base58 encoded address of the Solana account. | 
 **x_wallet_auth** | **str**| A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [optional] 
 **x_idempotency_key** | **str**| An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  | [optional] 
 **export_evm_account_request** | [**ExportEvmAccountRequest**](ExportEvmAccountRequest.md)|  | [optional] 

### Return type

[**ExportSolanaAccount200Response**](ExportSolanaAccount200Response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully exported Solana account. |  -  |
**400** | Invalid request. |  -  |
**401** | Unauthorized. |  -  |
**402** | A payment method is required to complete this operation. |  -  |
**404** | Not found. |  -  |
**422** | Idempotency key conflict. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **export_solana_account_by_name**
> ExportSolanaAccount200Response export_solana_account_by_name(name, x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, export_evm_account_request=export_evm_account_request)

Export a Solana account by name

Export an existing Solana account's private key by its name. It is important to store the private key in a secure place after it's exported.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.export_evm_account_request import ExportEvmAccountRequest
from cdp.openapi_client.models.export_solana_account200_response import ExportSolanaAccount200Response
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
    api_instance = cdp.openapi_client.SolanaAccountsApi(api_client)
    name = 'my-account' # str | The name of the Solana account.
    x_wallet_auth = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywicm9sZSI6ImFkbWluIiwiZXhwIjoxNzAxOTgwMDAwfQ.HWvMTKmCCTxHaxjvZyLaC6UQ6TV3ErTDWBf7zmdH0Lw' # str | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  (optional)
    x_idempotency_key = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  (optional)
    export_evm_account_request = cdp.openapi_client.ExportEvmAccountRequest() # ExportEvmAccountRequest |  (optional)

    try:
        # Export a Solana account by name
        api_response = await api_instance.export_solana_account_by_name(name, x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, export_evm_account_request=export_evm_account_request)
        print("The response of SolanaAccountsApi->export_solana_account_by_name:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling SolanaAccountsApi->export_solana_account_by_name: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **name** | **str**| The name of the Solana account. | 
 **x_wallet_auth** | **str**| A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [optional] 
 **x_idempotency_key** | **str**| An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  | [optional] 
 **export_evm_account_request** | [**ExportEvmAccountRequest**](ExportEvmAccountRequest.md)|  | [optional] 

### Return type

[**ExportSolanaAccount200Response**](ExportSolanaAccount200Response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully exported Solana account. |  -  |
**400** | Invalid request. |  -  |
**401** | Unauthorized. |  -  |
**402** | A payment method is required to complete this operation. |  -  |
**404** | Not found. |  -  |
**422** | Idempotency key conflict. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_solana_account**
> SolanaAccount get_solana_account(address)

Get a Solana account by address

Gets a Solana account by its address.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.solana_account import SolanaAccount
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
    api_instance = cdp.openapi_client.SolanaAccountsApi(api_client)
    address = 'HpabPRRCFbBKSuJr5PdkVvQc85FyxyTWkFM2obBRSvHT' # str | The base58 encoded address of the Solana account.

    try:
        # Get a Solana account by address
        api_response = await api_instance.get_solana_account(address)
        print("The response of SolanaAccountsApi->get_solana_account:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling SolanaAccountsApi->get_solana_account: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **address** | **str**| The base58 encoded address of the Solana account. | 

### Return type

[**SolanaAccount**](SolanaAccount.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth), [sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully got Solana account. |  -  |
**400** | Invalid request. |  -  |
**404** | Not found. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_solana_account_by_name**
> SolanaAccount get_solana_account_by_name(name)

Get a Solana account by name

Gets a Solana account by its name.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.solana_account import SolanaAccount
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
    api_instance = cdp.openapi_client.SolanaAccountsApi(api_client)
    name = 'my-account' # str | The name of the Solana account.

    try:
        # Get a Solana account by name
        api_response = await api_instance.get_solana_account_by_name(name)
        print("The response of SolanaAccountsApi->get_solana_account_by_name:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling SolanaAccountsApi->get_solana_account_by_name: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **name** | **str**| The name of the Solana account. | 

### Return type

[**SolanaAccount**](SolanaAccount.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth), [sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully got Solana account. |  -  |
**400** | Invalid request. |  -  |
**404** | Not found. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **import_solana_account**
> SolanaAccount import_solana_account(x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, import_solana_account_request=import_solana_account_request)

Import a Solana account

Import an existing Solana account into the developer's CDP Project. This API should be called from the [CDP SDK](https://github.com/coinbase/cdp-sdk) to ensure that the associated private key is properly encrypted.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.import_solana_account_request import ImportSolanaAccountRequest
from cdp.openapi_client.models.solana_account import SolanaAccount
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
    api_instance = cdp.openapi_client.SolanaAccountsApi(api_client)
    x_wallet_auth = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywicm9sZSI6ImFkbWluIiwiZXhwIjoxNzAxOTgwMDAwfQ.HWvMTKmCCTxHaxjvZyLaC6UQ6TV3ErTDWBf7zmdH0Lw' # str | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  (optional)
    x_idempotency_key = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  (optional)
    import_solana_account_request = cdp.openapi_client.ImportSolanaAccountRequest() # ImportSolanaAccountRequest |  (optional)

    try:
        # Import a Solana account
        api_response = await api_instance.import_solana_account(x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, import_solana_account_request=import_solana_account_request)
        print("The response of SolanaAccountsApi->import_solana_account:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling SolanaAccountsApi->import_solana_account: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **x_wallet_auth** | **str**| A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [optional] 
 **x_idempotency_key** | **str**| An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  | [optional] 
 **import_solana_account_request** | [**ImportSolanaAccountRequest**](ImportSolanaAccountRequest.md)|  | [optional] 

### Return type

[**SolanaAccount**](SolanaAccount.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**201** | Successfully imported Solana account. |  -  |
**400** | Invalid request. |  -  |
**401** | Unauthorized. |  -  |
**402** | A payment method is required to complete this operation. |  -  |
**409** | Resource already exists. |  -  |
**422** | Idempotency key conflict. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **list_solana_accounts**
> ListSolanaAccounts200Response list_solana_accounts(page_size=page_size, page_token=page_token)

List Solana accounts or get account by name

Lists the Solana accounts belonging to the developer. The response is paginated, and by default, returns 20 accounts per page.  If a name is provided, the response will contain only the account with that name.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.list_solana_accounts200_response import ListSolanaAccounts200Response
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
    api_instance = cdp.openapi_client.SolanaAccountsApi(api_client)
    page_size = 20 # int | The number of accounts to return per page. (optional) (default to 20)
    page_token = 'eyJsYXN0X2lkIjogImFiYzEyMyIsICJ0aW1lc3RhbXAiOiAxNzA3ODIzNzAxfQ==' # str | The token for the next page of accounts, if any. (optional)

    try:
        # List Solana accounts or get account by name
        api_response = await api_instance.list_solana_accounts(page_size=page_size, page_token=page_token)
        print("The response of SolanaAccountsApi->list_solana_accounts:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling SolanaAccountsApi->list_solana_accounts: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **page_size** | **int**| The number of accounts to return per page. | [optional] [default to 20]
 **page_token** | **str**| The token for the next page of accounts, if any. | [optional] 

### Return type

[**ListSolanaAccounts200Response**](ListSolanaAccounts200Response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth), [sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully listed Solana accounts. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **send_solana_transaction**
> SendSolanaTransaction200Response send_solana_transaction(x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, send_solana_transaction_request=send_solana_transaction_request)

Send a Solana transaction

Signs and sends a single Solana transaction using multiple Solana accounts. The transaction may contain contain several instructions, each of which may require signatures from different account keys.  The transaction should be serialized into a byte array and base64 encoded. The API handles recent blockhash management and fee estimation, leaving the developer to provide only the minimal set of fields necessary to send the transaction.  **Transaction types**  The following transaction types are supported: * [Legacy transactions](https://solana.com/developers/guides/advanced/versions#current-transaction-versions) * [Versioned transactions](https://solana.com/developers/guides/advanced/versions)  **Instruction Batching**  To batch multiple operations, include multiple instructions within a single transaction. All instructions within a transaction are executed atomically - if any instruction fails, the entire transaction fails and is rolled back.  **Network Support**  The following Solana networks are supported: * `solana` - Solana Mainnet * `solana-devnet` - Solana Devnet  The developer is responsible for ensuring that the unsigned transaction is valid, as the API will not validate the transaction.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.send_solana_transaction200_response import SendSolanaTransaction200Response
from cdp.openapi_client.models.send_solana_transaction_request import SendSolanaTransactionRequest
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
    api_instance = cdp.openapi_client.SolanaAccountsApi(api_client)
    x_wallet_auth = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywicm9sZSI6ImFkbWluIiwiZXhwIjoxNzAxOTgwMDAwfQ.HWvMTKmCCTxHaxjvZyLaC6UQ6TV3ErTDWBf7zmdH0Lw' # str | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  (optional)
    x_idempotency_key = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  (optional)
    send_solana_transaction_request = cdp.openapi_client.SendSolanaTransactionRequest() # SendSolanaTransactionRequest |  (optional)

    try:
        # Send a Solana transaction
        api_response = await api_instance.send_solana_transaction(x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, send_solana_transaction_request=send_solana_transaction_request)
        print("The response of SolanaAccountsApi->send_solana_transaction:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling SolanaAccountsApi->send_solana_transaction: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **x_wallet_auth** | **str**| A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [optional] 
 **x_idempotency_key** | **str**| An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  | [optional] 
 **send_solana_transaction_request** | [**SendSolanaTransactionRequest**](SendSolanaTransactionRequest.md)|  | [optional] 

### Return type

[**SendSolanaTransaction200Response**](SendSolanaTransaction200Response.md)

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
**422** | Idempotency key conflict. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **sign_solana_message**
> SignSolanaMessage200Response sign_solana_message(address, x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, sign_solana_message_request=sign_solana_message_request)

Sign a message

Signs an arbitrary message with the given Solana account.  **WARNING:** Never sign a message that you didn't generate, as it can be an arbitrary transaction. For example, it might send all of your funds to an attacker.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.sign_solana_message200_response import SignSolanaMessage200Response
from cdp.openapi_client.models.sign_solana_message_request import SignSolanaMessageRequest
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
    api_instance = cdp.openapi_client.SolanaAccountsApi(api_client)
    address = 'HpabPRRCFbBKSuJr5PdkVvQc85FyxyTWkFM2obBRSvHT' # str | The base58 encoded address of the Solana account.
    x_wallet_auth = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywicm9sZSI6ImFkbWluIiwiZXhwIjoxNzAxOTgwMDAwfQ.HWvMTKmCCTxHaxjvZyLaC6UQ6TV3ErTDWBf7zmdH0Lw' # str | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  (optional)
    x_idempotency_key = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  (optional)
    sign_solana_message_request = cdp.openapi_client.SignSolanaMessageRequest() # SignSolanaMessageRequest |  (optional)

    try:
        # Sign a message
        api_response = await api_instance.sign_solana_message(address, x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, sign_solana_message_request=sign_solana_message_request)
        print("The response of SolanaAccountsApi->sign_solana_message:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling SolanaAccountsApi->sign_solana_message: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **address** | **str**| The base58 encoded address of the Solana account. | 
 **x_wallet_auth** | **str**| A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [optional] 
 **x_idempotency_key** | **str**| An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  | [optional] 
 **sign_solana_message_request** | [**SignSolanaMessageRequest**](SignSolanaMessageRequest.md)|  | [optional] 

### Return type

[**SignSolanaMessage200Response**](SignSolanaMessage200Response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully signed message. |  -  |
**400** | Invalid request. |  -  |
**401** | Unauthorized. |  -  |
**402** | A payment method is required to complete this operation. |  -  |
**404** | Solana account not found. |  -  |
**409** | The resource already exists. |  -  |
**422** | Idempotency key conflict. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **sign_solana_transaction**
> SignSolanaTransaction200Response sign_solana_transaction(address, x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, sign_solana_transaction_request=sign_solana_transaction_request)

Sign a transaction

Signs a transaction with the given Solana account. The unsigned transaction should be serialized into a byte array and then encoded as base64.  **Transaction types**  The following transaction types are supported: * [Legacy transactions](https://solana-labs.github.io/solana-web3.js/classes/Transaction.html) * [Versioned transactions](https://solana-labs.github.io/solana-web3.js/classes/VersionedTransaction.html)  The developer is responsible for ensuring that the unsigned transaction is valid, as the API will not validate the transaction.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.sign_solana_transaction200_response import SignSolanaTransaction200Response
from cdp.openapi_client.models.sign_solana_transaction_request import SignSolanaTransactionRequest
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
    api_instance = cdp.openapi_client.SolanaAccountsApi(api_client)
    address = 'HpabPRRCFbBKSuJr5PdkVvQc85FyxyTWkFM2obBRSvHT' # str | The base58 encoded address of the Solana account.
    x_wallet_auth = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywicm9sZSI6ImFkbWluIiwiZXhwIjoxNzAxOTgwMDAwfQ.HWvMTKmCCTxHaxjvZyLaC6UQ6TV3ErTDWBf7zmdH0Lw' # str | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  (optional)
    x_idempotency_key = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  (optional)
    sign_solana_transaction_request = cdp.openapi_client.SignSolanaTransactionRequest() # SignSolanaTransactionRequest |  (optional)

    try:
        # Sign a transaction
        api_response = await api_instance.sign_solana_transaction(address, x_wallet_auth=x_wallet_auth, x_idempotency_key=x_idempotency_key, sign_solana_transaction_request=sign_solana_transaction_request)
        print("The response of SolanaAccountsApi->sign_solana_transaction:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling SolanaAccountsApi->sign_solana_transaction: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **address** | **str**| The base58 encoded address of the Solana account. | 
 **x_wallet_auth** | **str**| A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [optional] 
 **x_idempotency_key** | **str**| An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  | [optional] 
 **sign_solana_transaction_request** | [**SignSolanaTransactionRequest**](SignSolanaTransactionRequest.md)|  | [optional] 

### Return type

[**SignSolanaTransaction200Response**](SignSolanaTransaction200Response.md)

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
**404** | Solana account not found. |  -  |
**409** | The resource already exists. |  -  |
**422** | Idempotency key conflict. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **update_solana_account**
> SolanaAccount update_solana_account(address, x_idempotency_key=x_idempotency_key, update_solana_account_request=update_solana_account_request)

Update a Solana account

Updates an existing Solana account. Use this to update the account's name or account-level policy.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.solana_account import SolanaAccount
from cdp.openapi_client.models.update_solana_account_request import UpdateSolanaAccountRequest
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
    api_instance = cdp.openapi_client.SolanaAccountsApi(api_client)
    address = 'HpabPRRCFbBKSuJr5PdkVvQc85FyxyTWkFM2obBRSvHT' # str | The base58 encoded address of the Solana account.
    x_idempotency_key = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  (optional)
    update_solana_account_request = cdp.openapi_client.UpdateSolanaAccountRequest() # UpdateSolanaAccountRequest |  (optional)

    try:
        # Update a Solana account
        api_response = await api_instance.update_solana_account(address, x_idempotency_key=x_idempotency_key, update_solana_account_request=update_solana_account_request)
        print("The response of SolanaAccountsApi->update_solana_account:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling SolanaAccountsApi->update_solana_account: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **address** | **str**| The base58 encoded address of the Solana account. | 
 **x_idempotency_key** | **str**| An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  | [optional] 
 **update_solana_account_request** | [**UpdateSolanaAccountRequest**](UpdateSolanaAccountRequest.md)|  | [optional] 

### Return type

[**SolanaAccount**](SolanaAccount.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth), [sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully updated Solana account. |  -  |
**400** | Invalid request. |  -  |
**404** | Solana account not found. |  -  |
**409** | The resource already exists. |  -  |
**422** | Idempotency key conflict. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **update_solana_account_policy**
> SolanaAccount update_solana_account_policy(address, x_idempotency_key=x_idempotency_key, update_solana_account_policy_request=update_solana_account_policy_request)

Update a Solana account's policy

Updates an existing Solana account's policy.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.solana_account import SolanaAccount
from cdp.openapi_client.models.update_solana_account_policy_request import UpdateSolanaAccountPolicyRequest
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
    api_instance = cdp.openapi_client.SolanaAccountsApi(api_client)
    address = 'HpabPRRCFbBKSuJr5PdkVvQc85FyxyTWkFM2obBRSvHT' # str | The base58 encoded address of the Solana account.
    x_idempotency_key = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  (optional)
    update_solana_account_policy_request = cdp.openapi_client.UpdateSolanaAccountPolicyRequest() # UpdateSolanaAccountPolicyRequest |  (optional)

    try:
        # Update a Solana account's policy
        api_response = await api_instance.update_solana_account_policy(address, x_idempotency_key=x_idempotency_key, update_solana_account_policy_request=update_solana_account_policy_request)
        print("The response of SolanaAccountsApi->update_solana_account_policy:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling SolanaAccountsApi->update_solana_account_policy: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **address** | **str**| The base58 encoded address of the Solana account. | 
 **x_idempotency_key** | **str**| An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  | [optional] 
 **update_solana_account_policy_request** | [**UpdateSolanaAccountPolicyRequest**](UpdateSolanaAccountPolicyRequest.md)|  | [optional] 

### Return type

[**SolanaAccount**](SolanaAccount.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth), [sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully updated Solana account. |  -  |
**400** | Invalid request. |  -  |
**404** | Solana account not found. |  -  |
**409** | The resource already exists. |  -  |
**422** | Idempotency key conflict. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

