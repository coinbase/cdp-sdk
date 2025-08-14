# CreateOnrampOrderRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**agreement_accepted_at** | **String** | The timestamp of when the user acknowledged that by using Coinbase Onramp they are accepting the Coinbase Terms  (https://www.coinbase.com/legal/guest-checkout/us), User Agreement (https://www.coinbase.com/legal/user_agreement),  and Privacy Policy (https://www.coinbase.com/legal/privacy). | 
**destination_address** | **String** | The address the purchased crypto will be sent to. | 
**destination_network** | **String** | The name of the crypto network the purchased currency will be sent on.  Use the [Onramp Buy Options API](https://docs.cdp.coinbase.com/api-reference/rest-api/onramp-offramp/get-buy-options) to discover the supported networks for your user's location. | 
**email** | **String** | The verified email address of the user requesting the onramp transaction. This email must be verified by your app (via OTP) before being used with the Onramp API. | 
**is_quote** | Option<**bool**> | If true, this API will return a quote without creating any transaction. | [optional][default to false]
**partner_order_ref** | Option<**String**> | Optional partner order reference ID. | [optional]
**partner_user_ref** | **String** | A unique string that represents the user in your app. This can be used to link individual transactions  together so you can retrieve the transaction history for your users. Prefix this string with “sandbox-”  (e.g. \"sandbox-user-1234\") to perform a sandbox transaction which will allow you to test your integration  without any real transfer of funds.  This value can be used with with [Onramp User Transactions API](https://docs.cdp.coinbase.com/api-reference/rest-api/onramp-offramp/get-onramp-transactions-by-id) to retrieve all transactions created by the user. | 
**payment_amount** | Option<**String**> | A string representing the amount of fiat the user wishes to pay in exchange for crypto. When using  this parameter, the returned quote will be inclusive of fees i.e. the user will pay this exact amount  of the payment currency. | [optional]
**payment_currency** | **String** | The fiat currency to be converted to crypto. | 
**payment_method** | [**models::OnrampPaymentMethodTypeId**](OnrampPaymentMethodTypeId.md) |  | 
**phone_number** | **String** | The phone number of the user requesting the onramp transaction in E.164 format. This phone number must  be verified by your app (via OTP) before being used with the Onramp API.  Please refer to the [Onramp docs](https://docs.cdp.coinbase.com/onramp-&-offramp/onramp-apis/apple-pay-onramp-api) for more details on phone number verification requirements and best practices. | 
**phone_number_verified_at** | **String** | Timestamp of when the user's phone number was verified via OTP. User phone number must be verified  every 60 days. If this timestamp is older than 60 days, an error will be returned. | 
**purchase_amount** | Option<**String**> | A string representing the amount of crypto the user wishes to purchase. When using this parameter the  returned quote will be exclusive of fees i.e. the user will receive this exact amount of the purchase  currency. | [optional]
**purchase_currency** | **String** | The ticker (e.g. `BTC`, `USDC`, `SOL`) or the Coinbase UUID (e.g. `d85dce9b-5b73-5c3c-8978-522ce1d1c1b4`)  of the crypto asset to be purchased.  Use the [Onramp Buy Options API](https://docs.cdp.coinbase.com/api-reference/rest-api/onramp-offramp/get-buy-options) to discover the supported purchase currencies for your user's location. | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


