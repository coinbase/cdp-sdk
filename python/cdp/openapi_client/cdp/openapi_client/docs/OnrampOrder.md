# OnrampOrder

An Onramp order.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**order_id** | **str** | The ID of the onramp order. | 
**payment_total** | **str** | The total amount of fiat to be paid. | 
**payment_subtotal** | **str** | The amount of fiat to be converted to crypto. | 
**payment_currency** | **str** | The fiat currency to be converted to crypto. | 
**payment_method** | [**OnrampPaymentMethodTypeId**](OnrampPaymentMethodTypeId.md) |  | 
**purchase_amount** | **str** | The amount of crypto to be purchased. | 
**purchase_currency** | **str** | The crypto currency to be purchased. | 
**fees** | [**List[OnrampOrderFee]**](OnrampOrderFee.md) | The fees associated with the order. | 
**exchange_rate** | **str** | The exchange rate used to convert fiat to crypto. | 
**destination_address** | **str** | The destination address to send the crypto to. | 
**destination_network** | **str** | The network to send the crypto on. | 
**status** | [**OnrampOrderStatus**](OnrampOrderStatus.md) |  | 
**tx_hash** | **str** | The transaction hash of the order (only available once crypto has been sent). | [optional] 
**created_at** | **str** | The date and time the order was created. | 
**updated_at** | **str** | The date and time the order was last updated. | 

## Example

```python
from cdp.openapi_client.models.onramp_order import OnrampOrder

# TODO update the JSON string below
json = "{}"
# create an instance of OnrampOrder from a JSON string
onramp_order_instance = OnrampOrder.from_json(json)
# print the JSON string representation of the object
print(OnrampOrder.to_json())

# convert the object into a dict
onramp_order_dict = onramp_order_instance.to_dict()
# create an instance of OnrampOrder from a dict
onramp_order_from_dict = OnrampOrder.from_dict(onramp_order_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


