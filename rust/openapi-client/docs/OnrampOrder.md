# OnrampOrder

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**order_id** | **String** | The ID of the onramp order. | 
**payment_total** | **String** | The total amount of fiat to be paid, inclusive of any fees. | 
**payment_subtotal** | **String** | The amount of fiat to be converted to crypto. | 
**payment_currency** | **String** | The fiat currency to be converted to crypto. | 
**payment_method** | [**models::OnrampPaymentMethodTypeId**](OnrampPaymentMethodTypeId.md) |  | 
**purchase_amount** | **String** | The amount of crypto to be purchased. | 
**purchase_currency** | **String** | The crypto currency to be purchased. | 
**fees** | [**Vec<models::OnrampOrderFee>**](OnrampOrderFee.md) | The fees associated with the order. | 
**exchange_rate** | **String** | The exchange rate used to convert fiat to crypto i.e. the crypto value of one fiat. | 
**destination_address** | **String** | The destination address to send the crypto to. | 
**destination_network** | **String** | The network to send the crypto on. | 
**status** | [**models::OnrampOrderStatus**](OnrampOrderStatus.md) |  | 
**tx_hash** | Option<**String**> | The transaction hash of the order (only available once crypto has been sent). | [optional]
**created_at** | **String** | The date and time the order was created. | 
**updated_at** | **String** | The date and time the order was last updated. | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


