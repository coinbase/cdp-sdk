# OnrampOrderFee

A fee associated with an order.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | **str** | The type of fee. | 
**amount** | **str** | The amount of the fee. | 
**currency** | **str** | The currency of the fee. | 

## Example

```python
from cdp.openapi_client.models.onramp_order_fee import OnrampOrderFee

# TODO update the JSON string below
json = "{}"
# create an instance of OnrampOrderFee from a JSON string
onramp_order_fee_instance = OnrampOrderFee.from_json(json)
# print the JSON string representation of the object
print(OnrampOrderFee.to_json())

# convert the object into a dict
onramp_order_fee_dict = onramp_order_fee_instance.to_dict()
# create an instance of OnrampOrderFee from a dict
onramp_order_fee_from_dict = OnrampOrderFee.from_dict(onramp_order_fee_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


