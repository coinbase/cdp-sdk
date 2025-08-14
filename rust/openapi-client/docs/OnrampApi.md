# \OnrampApi

All URIs are relative to *https://api.cdp.coinbase.com/platform*

Method | HTTP request | Description
------------- | ------------- | -------------
[**create_onramp_order**](OnrampApi.md#create_onramp_order) | **POST** /v2/onramp/orders | Create an onramp order
[**get_onramp_order_by_id**](OnrampApi.md#get_onramp_order_by_id) | **GET** /v2/onramp/orders/{orderId} | Get an onramp order by ID



## create_onramp_order

> models::CreateOnrampOrder201Response create_onramp_order(create_onramp_order_request)
Create an onramp order

Create a new Onramp order or get a quote for an Onramp order. Either `paymentAmount` or `purchaseAmount` must be provided.  This API currently only supports the payment method `GUEST_CHECKOUT_APPLE_PAY`, and the `paymentLink` returned will only work in iOS apps. We do not support web integration via iframes at this time.  For detailed integration instructions and to get access to this API, refer to the  [Apple Pay Onramp API docs](https://docs.cdp.coinbase.com/onramp-&-offramp/onramp-apis/apple-pay-onramp-api).

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**create_onramp_order_request** | Option<[**CreateOnrampOrderRequest**](CreateOnrampOrderRequest.md)> |  |  |

### Return type

[**models::CreateOnrampOrder201Response**](createOnrampOrder_201_response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## get_onramp_order_by_id

> models::GetOnrampOrderById200Response get_onramp_order_by_id(order_id)
Get an onramp order by ID

Get an onramp order by ID.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**order_id** | **String** | The ID of the onramp order to retrieve. | [required] |

### Return type

[**models::GetOnrampOrderById200Response**](getOnrampOrderById_200_response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

