# cdp.openapi_client.PaymentsAlphaApi

All URIs are relative to *https://api.cdp.coinbase.com/platform*

Method | HTTP request | Description
------------- | ------------- | -------------
[**create_payment_transfer_quote**](PaymentsAlphaApi.md#create_payment_transfer_quote) | **POST** /v2/payments/transfers | Create a transfer quote
[**execute_payment_transfer_quote**](PaymentsAlphaApi.md#execute_payment_transfer_quote) | **POST** /v2/payments/transfers/{transferId}/execute | Execute a transfer quote
[**get_crypto_rails**](PaymentsAlphaApi.md#get_crypto_rails) | **GET** /v2/payments/rails/crypto | Get the crypto rails
[**get_payment_methods**](PaymentsAlphaApi.md#get_payment_methods) | **GET** /v2/payments/rails/payment-methods | Get the fiat payment methods
[**get_payment_transfer**](PaymentsAlphaApi.md#get_payment_transfer) | **GET** /v2/payments/transfers/{transferId} | Get a transfer by ID


# **create_payment_transfer_quote**
> CreatePaymentTransferQuote201Response create_payment_transfer_quote(create_payment_transfer_quote_request)

Create a transfer quote

Creates a new transfer quote, which can then be executed using the Execute a transfer quote endpoint. If you want to automatically execute the transfer without needing to confirm, specify execute as true.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.create_payment_transfer_quote201_response import CreatePaymentTransferQuote201Response
from cdp.openapi_client.models.create_payment_transfer_quote_request import CreatePaymentTransferQuoteRequest
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
    api_instance = cdp.openapi_client.PaymentsAlphaApi(api_client)
    create_payment_transfer_quote_request = cdp.openapi_client.CreatePaymentTransferQuoteRequest() # CreatePaymentTransferQuoteRequest | 

    try:
        # Create a transfer quote
        api_response = await api_instance.create_payment_transfer_quote(create_payment_transfer_quote_request)
        print("The response of PaymentsAlphaApi->create_payment_transfer_quote:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling PaymentsAlphaApi->create_payment_transfer_quote: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **create_payment_transfer_quote_request** | [**CreatePaymentTransferQuoteRequest**](CreatePaymentTransferQuoteRequest.md)|  | 

### Return type

[**CreatePaymentTransferQuote201Response**](CreatePaymentTransferQuote201Response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**201** | Successfully created a transfer. |  -  |
**400** | Invalid request. |  -  |
**401** | Unauthorized. |  -  |
**429** | Rate limit exceeded. |  -  |
**500** | Internal server error. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **execute_payment_transfer_quote**
> Transfer execute_payment_transfer_quote(transfer_id)

Execute a transfer quote

Executes a transfer quote which was created using the Create a transfer quote endpoint.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.transfer import Transfer
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
    api_instance = cdp.openapi_client.PaymentsAlphaApi(api_client)
    transfer_id = '123e4567-e89b-12d3-a456-426614174000' # str | The ID of the transfer.

    try:
        # Execute a transfer quote
        api_response = await api_instance.execute_payment_transfer_quote(transfer_id)
        print("The response of PaymentsAlphaApi->execute_payment_transfer_quote:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling PaymentsAlphaApi->execute_payment_transfer_quote: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **transfer_id** | **str**| The ID of the transfer. | 

### Return type

[**Transfer**](Transfer.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully committed a transfer. |  -  |
**400** | Invalid request. |  -  |
**401** | Unauthorized. |  -  |
**404** | Transfer not found. |  -  |
**429** | Rate limit exceeded. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_crypto_rails**
> List[CryptoRail] get_crypto_rails(networks=networks)

Get the crypto rails

Gets the crypto rails that can be used to send funds or receive funds.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.crypto_rail import CryptoRail
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
    api_instance = cdp.openapi_client.PaymentsAlphaApi(api_client)
    networks = 'base,ethereum' # str | Comma separated list of networks to filter the rails by. (optional)

    try:
        # Get the crypto rails
        api_response = await api_instance.get_crypto_rails(networks=networks)
        print("The response of PaymentsAlphaApi->get_crypto_rails:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling PaymentsAlphaApi->get_crypto_rails: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **networks** | **str**| Comma separated list of networks to filter the rails by. | [optional] 

### Return type

[**List[CryptoRail]**](CryptoRail.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully retrieved crypto rails. |  -  |
**401** | Unauthorized. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_payment_methods**
> List[PaymentMethod] get_payment_methods()

Get the fiat payment methods

Gets the fiat payment methods that can be used to send funds or receive funds. This is the list of payment methods configured for your account.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.payment_method import PaymentMethod
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
    api_instance = cdp.openapi_client.PaymentsAlphaApi(api_client)

    try:
        # Get the fiat payment methods
        api_response = await api_instance.get_payment_methods()
        print("The response of PaymentsAlphaApi->get_payment_methods:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling PaymentsAlphaApi->get_payment_methods: %s\n" % e)
```



### Parameters

This endpoint does not need any parameter.

### Return type

[**List[PaymentMethod]**](PaymentMethod.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully retrieved the payment methods. |  -  |
**401** | Unauthorized. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_payment_transfer**
> Transfer get_payment_transfer(transfer_id)

Get a transfer by ID

Gets a transfer by ID.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.transfer import Transfer
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
    api_instance = cdp.openapi_client.PaymentsAlphaApi(api_client)
    transfer_id = '123e4567-e89b-12d3-a456-426614174000' # str | The ID of the transfer.

    try:
        # Get a transfer by ID
        api_response = await api_instance.get_payment_transfer(transfer_id)
        print("The response of PaymentsAlphaApi->get_payment_transfer:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling PaymentsAlphaApi->get_payment_transfer: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **transfer_id** | **str**| The ID of the transfer. | 

### Return type

[**Transfer**](Transfer.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully got a transfer by ID. |  -  |
**400** | Invalid request. |  -  |
**401** | Unauthorized. |  -  |
**404** | Transfer not found. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

