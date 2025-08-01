# cdp.openapi_client.WalletSecretsInternalApi

All URIs are relative to *https://api.cdp.coinbase.com/platform*

Method | HTTP request | Description
------------- | ------------- | -------------
[**get_wallet_secret_metadata**](WalletSecretsInternalApi.md#get_wallet_secret_metadata) | **GET** /v2/wallet/secrets | Get the currently active Wallet Secret
[**register_wallet_secret**](WalletSecretsInternalApi.md#register_wallet_secret) | **POST** /v2/wallet/secrets | Register a Wallet Secret
[**update_wallet_secret**](WalletSecretsInternalApi.md#update_wallet_secret) | **PUT** /v2/wallet/secrets | Update Wallet Secret


# **get_wallet_secret_metadata**
> WalletSecretMetadata get_wallet_secret_metadata()

Get the currently active Wallet Secret

Gets the currently active Wallet Secret in the CDP project. This API is available only to the CDP Portal, and should not be exposed externally.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.wallet_secret_metadata import WalletSecretMetadata
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
    api_instance = cdp.openapi_client.WalletSecretsInternalApi(api_client)

    try:
        # Get the currently active Wallet Secret
        api_response = await api_instance.get_wallet_secret_metadata()
        print("The response of WalletSecretsInternalApi->get_wallet_secret_metadata:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling WalletSecretsInternalApi->get_wallet_secret_metadata: %s\n" % e)
```



### Parameters

This endpoint does not need any parameter.

### Return type

[**WalletSecretMetadata**](WalletSecretMetadata.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth), [sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully got Wallet Secret. |  -  |
**400** | Invalid request. |  -  |
**404** | Not found. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **register_wallet_secret**
> register_wallet_secret(x_wallet_auth=x_wallet_auth, register_wallet_secret_request=register_wallet_secret_request)

Register a Wallet Secret

Registers a Wallet Secret for a CDP project. This Wallet Secret can then be used to authenticate requests to the EVM and Solana Account APIs. Wallet Secrets should be generated using the following JavaScript code. The private key should be securely stored by the developer, and only the public key should be passed to this API. ```javascript window.crypto.subtle.generateKey(   {     name: \"ECDSA\",     namedCurve: \"P-256\", // secp256r1   },   true, // Allow key export   [\"sign\", \"verify\"] // Key usages ).then(keyPair => {   return Promise.all([     window.crypto.subtle.exportKey(\"pkcs8\", keyPair.privateKey),     window.crypto.subtle.exportKey(\"spki\", keyPair.publicKey)   ]); }).then(([privateKeyBuffer, publicKeyBuffer]) => {   const privateKeyBytes = new Uint8Array(privateKeyBuffer);   const publicKeyBytes = new Uint8Array(publicKeyBuffer);    // Safe way to convert large Uint8Arrays to strings   const privateKeyBase64 = btoa(     Array.from(privateKeyBytes)       .map(byte => String.fromCharCode(byte))       .join('')   );    const publicKeyBase64 = btoa(     Array.from(publicKeyBytes)       .map(byte => String.fromCharCode(byte))       .join('')   );    console.log(privateKeyBase64);   console.log(publicKeyBase64);    return { privateKeyBase64, publicKeyBase64 }; }); ``` All requests must include an `X-Wallet-Auth` header signed by the new wallet secret's private key. Additionally, authentication varies by use case: - **CDP Portal**: Uses session authentication for user-initiated registration. - **Server-side**: Uses API key authentication for programmatic registration (e.g., from a key management system).

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.register_wallet_secret_request import RegisterWalletSecretRequest
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
    api_instance = cdp.openapi_client.WalletSecretsInternalApi(api_client)
    x_wallet_auth = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywicm9sZSI6ImFkbWluIiwiZXhwIjoxNzAxOTgwMDAwfQ.HWvMTKmCCTxHaxjvZyLaC6UQ6TV3ErTDWBf7zmdH0Lw' # str | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  (optional)
    register_wallet_secret_request = cdp.openapi_client.RegisterWalletSecretRequest() # RegisterWalletSecretRequest |  (optional)

    try:
        # Register a Wallet Secret
        await api_instance.register_wallet_secret(x_wallet_auth=x_wallet_auth, register_wallet_secret_request=register_wallet_secret_request)
    except Exception as e:
        print("Exception when calling WalletSecretsInternalApi->register_wallet_secret: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **x_wallet_auth** | **str**| A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [optional] 
 **register_wallet_secret_request** | [**RegisterWalletSecretRequest**](RegisterWalletSecretRequest.md)|  | [optional] 

### Return type

void (empty response body)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth), [sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully registered Wallet Secret. |  -  |
**400** | Invalid public key. |  -  |
**409** | Already exists. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **update_wallet_secret**
> update_wallet_secret(second_factor_proof_token, x_wallet_auth=x_wallet_auth, update_wallet_secret_request=update_wallet_secret_request)

Update Wallet Secret

Updates the Wallet Secret for a CDP project. The updated Wallet Secret can then be used to authenticate requests to the EVM and Solana Account APIs. All requests must include an `X-Wallet-Auth` header signed by the new wallet secret's private key. Additionally, authentication varies by use case: - **CDP Portal**: Uses session authentication for user-initiated updates. - **Server-side**: Uses API key authentication for programmatic updates (e.g., from a key management system). The existing Wallet Secret in the project will be unregistered and can no longer be used.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.update_wallet_secret_request import UpdateWalletSecretRequest
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
    api_instance = cdp.openapi_client.WalletSecretsInternalApi(api_client)
    second_factor_proof_token = 'pt-v1-6c8c8a7e-347a-58f3-bde8-2a3566f0491e' # str | A proof token is a randomly generated, short-lived token issued after a user successfully completes a 2FA process  (e.g., SMS, Yubikey, etc.) on the CDP Portal.  These tokens securely demonstrate that the user has passed 2FA and is authorized to perform operations requiring 2FA  without having to reverify the challenge.   Proof tokens are single-use and exclusively utilized by APIs that rely on session authentication. 
    x_wallet_auth = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywicm9sZSI6ImFkbWluIiwiZXhwIjoxNzAxOTgwMDAwfQ.HWvMTKmCCTxHaxjvZyLaC6UQ6TV3ErTDWBf7zmdH0Lw' # str | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  (optional)
    update_wallet_secret_request = cdp.openapi_client.UpdateWalletSecretRequest() # UpdateWalletSecretRequest |  (optional)

    try:
        # Update Wallet Secret
        await api_instance.update_wallet_secret(second_factor_proof_token, x_wallet_auth=x_wallet_auth, update_wallet_secret_request=update_wallet_secret_request)
    except Exception as e:
        print("Exception when calling WalletSecretsInternalApi->update_wallet_secret: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **second_factor_proof_token** | **str**| A proof token is a randomly generated, short-lived token issued after a user successfully completes a 2FA process  (e.g., SMS, Yubikey, etc.) on the CDP Portal.  These tokens securely demonstrate that the user has passed 2FA and is authorized to perform operations requiring 2FA  without having to reverify the challenge.   Proof tokens are single-use and exclusively utilized by APIs that rely on session authentication.  | 
 **x_wallet_auth** | **str**| A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [optional] 
 **update_wallet_secret_request** | [**UpdateWalletSecretRequest**](UpdateWalletSecretRequest.md)|  | [optional] 

### Return type

void (empty response body)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth), [sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully updated Wallet Secret. |  -  |
**403** | User forbidden from performing the action. |  -  |
**404** | Not found. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

