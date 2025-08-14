# \PaymentsAlphaApi

All URIs are relative to *https://api.cdp.coinbase.com/platform*

Method | HTTP request | Description
------------- | ------------- | -------------
[**create_payment_transfer_quote**](PaymentsAlphaApi.md#create_payment_transfer_quote) | **POST** /v2/payments/transfers | Create a transfer quote
[**execute_payment_transfer_quote**](PaymentsAlphaApi.md#execute_payment_transfer_quote) | **POST** /v2/payments/transfers/{transferId}/execute | Execute a transfer quote
[**get_crypto_rails**](PaymentsAlphaApi.md#get_crypto_rails) | **GET** /v2/payments/rails/crypto | Get the crypto rails
[**get_payment_methods**](PaymentsAlphaApi.md#get_payment_methods) | **GET** /v2/payments/rails/payment-methods | Get the fiat payment methods
[**get_payment_transfer**](PaymentsAlphaApi.md#get_payment_transfer) | **GET** /v2/payments/transfers/{transferId} | Get a transfer by ID



## create_payment_transfer_quote

> models::CreatePaymentTransferQuote201Response create_payment_transfer_quote(create_payment_transfer_quote_request)
Create a transfer quote

Creates a new transfer quote, which can then be executed using the Execute a transfer quote endpoint. If you want to automatically execute the transfer without needing to confirm, specify execute as true.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**create_payment_transfer_quote_request** | [**CreatePaymentTransferQuoteRequest**](CreatePaymentTransferQuoteRequest.md) |  | [required] |

### Return type

[**models::CreatePaymentTransferQuote201Response**](createPaymentTransferQuote_201_response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## execute_payment_transfer_quote

> models::Transfer execute_payment_transfer_quote(transfer_id)
Execute a transfer quote

Executes a transfer quote which was created using the Create a transfer quote endpoint.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**transfer_id** | **String** | The ID of the transfer. | [required] |

### Return type

[**models::Transfer**](Transfer.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## get_crypto_rails

> Vec<models::CryptoRail> get_crypto_rails(networks)
Get the crypto rails

Gets the crypto rails that can be used to send funds or receive funds.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**networks** | Option<**String**> | Comma separated list of networks to filter the rails by. |  |

### Return type

[**Vec<models::CryptoRail>**](CryptoRail.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## get_payment_methods

> Vec<models::PaymentMethod> get_payment_methods()
Get the fiat payment methods

Gets the fiat payment methods that can be used to send funds or receive funds. This is the list of payment methods configured for your account.

### Parameters

This endpoint does not need any parameter.

### Return type

[**Vec<models::PaymentMethod>**](PaymentMethod.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## get_payment_transfer

> models::Transfer get_payment_transfer(transfer_id)
Get a transfer by ID

Gets a transfer by ID.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**transfer_id** | **String** | The ID of the transfer. | [required] |

### Return type

[**models::Transfer**](Transfer.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

