# SupportedX402PaymentKinds200Response


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**kinds** | [**List[X402SupportedPaymentKind]**](X402SupportedPaymentKind.md) | The list of supported payment kinds. | 

## Example

```python
from cdp.openapi_client.models.supported_x402_payment_kinds200_response import SupportedX402PaymentKinds200Response

# TODO update the JSON string below
json = "{}"
# create an instance of SupportedX402PaymentKinds200Response from a JSON string
supported_x402_payment_kinds200_response_instance = SupportedX402PaymentKinds200Response.from_json(json)
# print the JSON string representation of the object
print(SupportedX402PaymentKinds200Response.to_json())

# convert the object into a dict
supported_x402_payment_kinds200_response_dict = supported_x402_payment_kinds200_response_instance.to_dict()
# create an instance of SupportedX402PaymentKinds200Response from a dict
supported_x402_payment_kinds200_response_from_dict = SupportedX402PaymentKinds200Response.from_dict(supported_x402_payment_kinds200_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


