# PaymentMethodRequest

The fiat payment method request object.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **str** | The ID of the payment method. | 

## Example

```python
from cdp.openapi_client.models.payment_method_request import PaymentMethodRequest

# TODO update the JSON string below
json = "{}"
# create an instance of PaymentMethodRequest from a JSON string
payment_method_request_instance = PaymentMethodRequest.from_json(json)
# print the JSON string representation of the object
print(PaymentMethodRequest.to_json())

# convert the object into a dict
payment_method_request_dict = payment_method_request_instance.to_dict()
# create an instance of PaymentMethodRequest from a dict
payment_method_request_from_dict = PaymentMethodRequest.from_dict(payment_method_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


