# CreateOnrampOrderRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**agreement_accepted_at** | **datetime** | The timestamp of the time the user acknowledged they are accepting the Coinbase service agreement  (https://www.coinbase.com/legal/guest-checkout/us) by using Coinbase Onramp. | 
**destination_address** | **str** | The address the purchased crypto will be sent to. | 
**destination_network** | **str** | The name of the crypto network the purchased currency will be sent on.  Use the [Onramp Buy Options API](https://docs.cdp.coinbase.com/api-reference/rest-api/onramp-offramp/get-buy-options) to discover the supported networks for your user&#39;s location. | 
**email** | **str** | The verified email address of the user requesting the onramp transaction. This email must be verified by your app (via OTP) before being used with the Onramp API. | 
**is_quote** | **bool** | If true, this API will return a quote without creating any transaction. | [optional] [default to False]
**partner_order_ref** | **str** | Optional partner order reference ID. | [optional] 
**partner_user_ref** | **str** | A unique string that represents the user in your app. This can be used to link individual transactions  together so you can retrieve the transaction history for your users. Prefix this string with “sandbox-”  (e.g. \&quot;sandbox-user-1234\&quot;) to perform a sandbox transaction which will allow you to test your integration  without any real transfer of funds.  This value can be used with with [Onramp User Transactions API](https://docs.cdp.coinbase.com/api-reference/rest-api/onramp-offramp/get-onramp-transactions-by-id) to retrieve all transactions created by the user. | 
**payment_amount** | **str** | A string representing the amount of fiat the user wishes to pay in exchange for crypto. When using  this parameter, the returned quote will be inclusive of fees i.e. the user will pay this exact amount  of the payment currency. | [optional] 
**payment_currency** | **str** | The fiat currency to be converted to crypto. | 
**payment_method** | [**OnrampPaymentMethodTypeId**](OnrampPaymentMethodTypeId.md) |  | 
**phone_number** | **str** | The phone number of the user requesting the onramp transaction in E.164 format. This phone number must  be verified by your app (via OTP) before being used with the Onramp API.  Please refer to the [Onramp docs](https://docs.cdp.coinbase.com/onramp-&amp;-offramp/onramp-apis/apple-pay-onramp-api) for more details on phone number verification requirements and best practices. | 
**phone_number_verified_at** | **datetime** | Timestamp of when the user&#39;s phone number was verified via OTP. User phone number must be verified  every 60 days. If this timestamp is older than 60 days, an error will be returned. | 
**purchase_amount** | **str** | A string representing the amount of crypto the user wishes to purchase. When using this parameter the  returned quote will be exclusive of fees i.e. the user will receive this exact amount of the purchase  currency. | [optional] 
**purchase_currency** | **str** | The ticker (e.g. &#x60;BTC&#x60;, &#x60;USDC&#x60;) or the UUID (e.g. &#x60;d85dce9b-5b73-5c3c-8978-522ce1d1c1b4&#x60;) of crypto  asset to be purchased.  Use the [Onramp Buy Options API](https://docs.cdp.coinbase.com/api-reference/rest-api/onramp-offramp/get-buy-options) to discover the supported purchase currencies for your user&#39;s location. | 

## Example

```python
from cdp.openapi_client.models.create_onramp_order_request import CreateOnrampOrderRequest

# TODO update the JSON string below
json = "{}"
# create an instance of CreateOnrampOrderRequest from a JSON string
create_onramp_order_request_instance = CreateOnrampOrderRequest.from_json(json)
# print the JSON string representation of the object
print(CreateOnrampOrderRequest.to_json())

# convert the object into a dict
create_onramp_order_request_dict = create_onramp_order_request_instance.to_dict()
# create an instance of CreateOnrampOrderRequest from a dict
create_onramp_order_request_from_dict = CreateOnrampOrderRequest.from_dict(create_onramp_order_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


