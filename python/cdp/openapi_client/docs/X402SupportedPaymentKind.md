# X402SupportedPaymentKind

The supported payment kind for the x402 protocol. A kind is comprised of a scheme and a network, which together uniquely identify a way to move money on the x402 protocol. For more details, please see [x402 Schemes](https://github.com/coinbase/x402?tab=readme-ov-file#schemes).

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**x402_version** | [**X402Version**](X402Version.md) |  | 
**scheme** | **str** | The scheme of the payment protocol. | 
**network** | **str** | The network of the blockchain. | 

## Example

```python
from cdp.openapi_client.models.x402_supported_payment_kind import X402SupportedPaymentKind

# TODO update the JSON string below
json = "{}"
# create an instance of X402SupportedPaymentKind from a JSON string
x402_supported_payment_kind_instance = X402SupportedPaymentKind.from_json(json)
# print the JSON string representation of the object
print(X402SupportedPaymentKind.to_json())

# convert the object into a dict
x402_supported_payment_kind_dict = x402_supported_payment_kind_instance.to_dict()
# create an instance of X402SupportedPaymentKind from a dict
x402_supported_payment_kind_from_dict = X402SupportedPaymentKind.from_dict(x402_supported_payment_kind_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


