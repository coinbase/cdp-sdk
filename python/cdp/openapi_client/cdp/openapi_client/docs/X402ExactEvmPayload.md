# X402ExactEvmPayload

The x402 protocol exact scheme payload for EVM networks. The scheme is implemented using ERC-3009. For more details, please see [EVM Exact Scheme Details](https://github.com/coinbase/x402/blob/main/specs/schemes/exact/scheme_exact_evm.md).

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**signature** | **str** | The EIP-712 hex-encoded signature of the ERC-3009 authorization message. | 
**authorization** | [**X402ExactEvmPayloadAuthorization**](X402ExactEvmPayloadAuthorization.md) |  | 

## Example

```python
from cdp.openapi_client.models.x402_exact_evm_payload import X402ExactEvmPayload

# TODO update the JSON string below
json = "{}"
# create an instance of X402ExactEvmPayload from a JSON string
x402_exact_evm_payload_instance = X402ExactEvmPayload.from_json(json)
# print the JSON string representation of the object
print(X402ExactEvmPayload.to_json())

# convert the object into a dict
x402_exact_evm_payload_dict = x402_exact_evm_payload_instance.to_dict()
# create an instance of X402ExactEvmPayload from a dict
x402_exact_evm_payload_from_dict = X402ExactEvmPayload.from_dict(x402_exact_evm_payload_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


