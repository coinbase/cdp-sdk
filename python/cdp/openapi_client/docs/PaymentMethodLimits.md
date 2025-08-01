# PaymentMethodLimits

The limits of the payment method.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**source_limit** | [**PaymentMethodLimitsSourceLimit**](PaymentMethodLimitsSourceLimit.md) |  | [optional] 
**target_limit** | [**PaymentMethodLimitsTargetLimit**](PaymentMethodLimitsTargetLimit.md) |  | [optional] 

## Example

```python
from cdp.openapi_client.models.payment_method_limits import PaymentMethodLimits

# TODO update the JSON string below
json = "{}"
# create an instance of PaymentMethodLimits from a JSON string
payment_method_limits_instance = PaymentMethodLimits.from_json(json)
# print the JSON string representation of the object
print(PaymentMethodLimits.to_json())

# convert the object into a dict
payment_method_limits_dict = payment_method_limits_instance.to_dict()
# create an instance of PaymentMethodLimits from a dict
payment_method_limits_from_dict = PaymentMethodLimits.from_dict(payment_method_limits_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


