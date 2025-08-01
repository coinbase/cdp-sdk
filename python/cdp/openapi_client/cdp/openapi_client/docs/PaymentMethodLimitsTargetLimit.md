# PaymentMethodLimitsTargetLimit

The limit for this payment method being used as a target for transfers.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**amount** | **str** | The amount of the limit. | [optional] 
**currency** | **str** | The currency of the limit. | [optional] 

## Example

```python
from cdp.openapi_client.models.payment_method_limits_target_limit import PaymentMethodLimitsTargetLimit

# TODO update the JSON string below
json = "{}"
# create an instance of PaymentMethodLimitsTargetLimit from a JSON string
payment_method_limits_target_limit_instance = PaymentMethodLimitsTargetLimit.from_json(json)
# print the JSON string representation of the object
print(PaymentMethodLimitsTargetLimit.to_json())

# convert the object into a dict
payment_method_limits_target_limit_dict = payment_method_limits_target_limit_instance.to_dict()
# create an instance of PaymentMethodLimitsTargetLimit from a dict
payment_method_limits_target_limit_from_dict = PaymentMethodLimitsTargetLimit.from_dict(payment_method_limits_target_limit_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


