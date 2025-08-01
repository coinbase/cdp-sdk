# VerifyX402PaymentRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**x402_version** | [**X402Version**](X402Version.md) |  | 
**payment_payload** | [**X402PaymentPayload**](X402PaymentPayload.md) |  | 
**payment_requirements** | [**X402PaymentRequirements**](X402PaymentRequirements.md) |  | 

## Example

```python
from cdp.openapi_client.models.verify_x402_payment_request import VerifyX402PaymentRequest

# TODO update the JSON string below
json = "{}"
# create an instance of VerifyX402PaymentRequest from a JSON string
verify_x402_payment_request_instance = VerifyX402PaymentRequest.from_json(json)
# print the JSON string representation of the object
print(VerifyX402PaymentRequest.to_json())

# convert the object into a dict
verify_x402_payment_request_dict = verify_x402_payment_request_instance.to_dict()
# create an instance of VerifyX402PaymentRequest from a dict
verify_x402_payment_request_from_dict = VerifyX402PaymentRequest.from_dict(verify_x402_payment_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


