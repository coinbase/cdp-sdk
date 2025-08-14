# \EvmSwapsApi

All URIs are relative to *https://api.cdp.coinbase.com/platform*

Method | HTTP request | Description
------------- | ------------- | -------------
[**create_evm_swap_quote**](EvmSwapsApi.md#create_evm_swap_quote) | **POST** /v2/evm/swaps | Create a swap quote
[**get_evm_swap_price**](EvmSwapsApi.md#get_evm_swap_price) | **GET** /v2/evm/swaps/quote | Get a price estimate for a swap



## create_evm_swap_quote

> models::CreateSwapQuoteResponseWrapper create_evm_swap_quote(create_evm_swap_quote_request, x_idempotency_key)
Create a swap quote

Create a swap quote, which includes the payload to sign as well as the transaction data needed to execute the swap. The developer is responsible for signing the payload and submitting the transaction to the network in order to execute the swap.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**create_evm_swap_quote_request** | [**CreateEvmSwapQuoteRequest**](CreateEvmSwapQuoteRequest.md) |  | [required] |
**x_idempotency_key** | Option<**String**> | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  |  |

### Return type

[**models::CreateSwapQuoteResponseWrapper**](CreateSwapQuoteResponseWrapper.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## get_evm_swap_price

> models::GetSwapPriceResponseWrapper get_evm_swap_price(network, to_token, from_token, from_amount, taker, signer_address, gas_price, slippage_bps)
Get a price estimate for a swap

Get a price estimate for a swap between two tokens on an EVM network.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**network** | [**EvmSwapsNetwork**](.md) |  | [required] |
**to_token** | **String** |  | [required] |
**from_token** | **String** |  | [required] |
**from_amount** | **String** |  | [required] |
**taker** | **String** |  | [required] |
**signer_address** | Option<**String**> |  |  |
**gas_price** | Option<**String**> |  |  |
**slippage_bps** | Option<**i32**> |  |  |[default to 100]

### Return type

[**models::GetSwapPriceResponseWrapper**](GetSwapPriceResponseWrapper.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

