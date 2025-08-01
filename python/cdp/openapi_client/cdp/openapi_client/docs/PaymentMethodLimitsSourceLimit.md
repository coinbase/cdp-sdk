# PaymentMethodLimitsSourceLimit

The limit for this payment method being used as a source for transfers.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**amount** | **str** | The amount of the limit. | [optional] 
**currency** | **str** | The currency of the limit. | [optional] 

## Example

```python
from cdp.openapi_client.models.payment_method_limits_source_limit import PaymentMethodLimitsSourceLimit

# TODO update the JSON string below
json = "{}"
# create an instance of PaymentMethodLimitsSourceLimit from a JSON string
payment_method_limits_source_limit_instance = PaymentMethodLimitsSourceLimit.from_json(json)
# print the JSON string representation of the object
print(PaymentMethodLimitsSourceLimit.to_json())

# convert the object into a dict
payment_method_limits_source_limit_dict = payment_method_limits_source_limit_instance.to_dict()
# create an instance of PaymentMethodLimitsSourceLimit from a dict
payment_method_limits_source_limit_from_dict = PaymentMethodLimitsSourceLimit.from_dict(payment_method_limits_source_limit_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


