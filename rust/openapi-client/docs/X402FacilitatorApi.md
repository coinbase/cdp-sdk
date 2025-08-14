# \X402FacilitatorApi

All URIs are relative to *https://api.cdp.coinbase.com/platform*

Method | HTTP request | Description
------------- | ------------- | -------------
[**settle_x402_payment**](X402FacilitatorApi.md#settle_x402_payment) | **POST** /v2/x402/settle | Settle a payment
[**supported_x402_payment_kinds**](X402FacilitatorApi.md#supported_x402_payment_kinds) | **GET** /v2/x402/supported | Get supported payment schemes and networks
[**verify_x402_payment**](X402FacilitatorApi.md#verify_x402_payment) | **POST** /v2/x402/verify | Verify a payment



## settle_x402_payment

> models::SettleX402Payment200Response settle_x402_payment(verify_x402_payment_request)
Settle a payment

Settle an x402 protocol payment with a specific scheme and network.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**verify_x402_payment_request** | [**VerifyX402PaymentRequest**](VerifyX402PaymentRequest.md) |  | [required] |

### Return type

[**models::SettleX402Payment200Response**](settleX402Payment_200_response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## supported_x402_payment_kinds

> models::SupportedX402PaymentKinds200Response supported_x402_payment_kinds()
Get supported payment schemes and networks

Get the supported x402 protocol payment schemes and networks that the facilitator is able to verify and settle payments for.

### Parameters

This endpoint does not need any parameter.

### Return type

[**models::SupportedX402PaymentKinds200Response**](supportedX402PaymentKinds_200_response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## verify_x402_payment

> models::VerifyX402Payment200Response verify_x402_payment(verify_x402_payment_request)
Verify a payment

Verify an x402 protocol payment with a specific scheme and network.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**verify_x402_payment_request** | [**VerifyX402PaymentRequest**](VerifyX402PaymentRequest.md) |  | [required] |

### Return type

[**models::VerifyX402Payment200Response**](verifyX402Payment_200_response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

