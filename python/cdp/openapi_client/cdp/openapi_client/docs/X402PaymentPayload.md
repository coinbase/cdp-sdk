# X402PaymentPayload

The x402 protocol payment payload that the client attaches to x402-paid API requests to the resource server in the X-PAYMENT header.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**x402_version** | [**X402Version**](X402Version.md) |  | 
**scheme** | **str** | The scheme of the payment protocol to use. Currently, the only supported scheme is &#x60;exact&#x60;. | 
**network** | **str** | The network of the blockchain to send payment on. | 
**payload** | [**X402PaymentPayloadPayload**](X402PaymentPayloadPayload.md) |  | 

## Example

```python
from cdp.openapi_client.models.x402_payment_payload import X402PaymentPayload

# TODO update the JSON string below
json = "{}"
# create an instance of X402PaymentPayload from a JSON string
x402_payment_payload_instance = X402PaymentPayload.from_json(json)
# print the JSON string representation of the object
print(X402PaymentPayload.to_json())

# convert the object into a dict
x402_payment_payload_dict = x402_payment_payload_instance.to_dict()
# create an instance of X402PaymentPayload from a dict
x402_payment_payload_from_dict = X402PaymentPayload.from_dict(x402_payment_payload_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


