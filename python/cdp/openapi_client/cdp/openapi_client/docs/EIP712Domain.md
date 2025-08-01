# EIP712Domain

The domain of the EIP-712 typed data.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **str** | The name of the DApp or protocol. | [optional] 
**version** | **str** | The version of the DApp or protocol. | [optional] 
**chain_id** | **int** | The chain ID of the EVM network. | [optional] 
**verifying_contract** | **str** | The 0x-prefixed EVM address of the verifying smart contract. | [optional] 
**salt** | **str** | The optional 32-byte 0x-prefixed hex salt for domain separation. | [optional] 

## Example

```python
from cdp.openapi_client.models.eip712_domain import EIP712Domain

# TODO update the JSON string below
json = "{}"
# create an instance of EIP712Domain from a JSON string
eip712_domain_instance = EIP712Domain.from_json(json)
# print the JSON string representation of the object
print(EIP712Domain.to_json())

# convert the object into a dict
eip712_domain_dict = eip712_domain_instance.to_dict()
# create an instance of EIP712Domain from a dict
eip712_domain_from_dict = EIP712Domain.from_dict(eip712_domain_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


