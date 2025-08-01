# X402PaymentPayloadPayload

The payload of the payment depending on the x402Version, scheme, and network.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**signature** | **str** | The EIP-712 hex-encoded signature of the ERC-3009 authorization message. | 
**authorization** | [**X402ExactEvmPayloadAuthorization**](X402ExactEvmPayloadAuthorization.md) |  | 

## Example

```python
from cdp.openapi_client.models.x402_payment_payload_payload import X402PaymentPayloadPayload

# TODO update the JSON string below
json = "{}"
# create an instance of X402PaymentPayloadPayload from a JSON string
x402_payment_payload_payload_instance = X402PaymentPayloadPayload.from_json(json)
# print the JSON string representation of the object
print(X402PaymentPayloadPayload.to_json())

# convert the object into a dict
x402_payment_payload_payload_dict = x402_payment_payload_payload_instance.to_dict()
# create an instance of X402PaymentPayloadPayload from a dict
x402_payment_payload_payload_from_dict = X402PaymentPayloadPayload.from_dict(x402_payment_payload_payload_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


