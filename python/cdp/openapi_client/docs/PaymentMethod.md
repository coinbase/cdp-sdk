# PaymentMethod

The fiat payment method object.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **str** | The ID of the payment method which previously was added. | 
**type** | **str** | The type of payment method. | 
**currency** | **str** | The currency of the payment method. | 
**actions** | [**List[PaymentRailAction]**](PaymentRailAction.md) | The actions for the payment method. | 
**limits** | [**PaymentMethodLimits**](PaymentMethodLimits.md) |  | [optional] 

## Example

```python
from cdp.openapi_client.models.payment_method import PaymentMethod

# TODO update the JSON string below
json = "{}"
# create an instance of PaymentMethod from a JSON string
payment_method_instance = PaymentMethod.from_json(json)
# print the JSON string representation of the object
print(PaymentMethod.to_json())

# convert the object into a dict
payment_method_dict = payment_method_instance.to_dict()
# create an instance of PaymentMethod from a dict
payment_method_from_dict = PaymentMethod.from_dict(payment_method_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


