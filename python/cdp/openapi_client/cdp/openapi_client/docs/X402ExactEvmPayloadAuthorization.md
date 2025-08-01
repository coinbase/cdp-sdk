# X402ExactEvmPayloadAuthorization

The authorization data for the ERC-3009 authorization message.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**var_from** | **str** | The 0x-prefixed, checksum EVM address of the sender of the payment. | 
**to** | **str** | The 0x-prefixed, checksum EVM address of the recipient of the payment. | 
**value** | **str** | The value of the payment, in atomic units of the payment asset. | 
**valid_after** | **str** | The unix timestamp after which the payment is valid. | 
**valid_before** | **str** | The unix timestamp before which the payment is valid. | 
**nonce** | **str** | The hex-encoded nonce of the payment. | 

## Example

```python
from cdp.openapi_client.models.x402_exact_evm_payload_authorization import X402ExactEvmPayloadAuthorization

# TODO update the JSON string below
json = "{}"
# create an instance of X402ExactEvmPayloadAuthorization from a JSON string
x402_exact_evm_payload_authorization_instance = X402ExactEvmPayloadAuthorization.from_json(json)
# print the JSON string representation of the object
print(X402ExactEvmPayloadAuthorization.to_json())

# convert the object into a dict
x402_exact_evm_payload_authorization_dict = x402_exact_evm_payload_authorization_instance.to_dict()
# create an instance of X402ExactEvmPayloadAuthorization from a dict
x402_exact_evm_payload_authorization_from_dict = X402ExactEvmPayloadAuthorization.from_dict(x402_exact_evm_payload_authorization_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


