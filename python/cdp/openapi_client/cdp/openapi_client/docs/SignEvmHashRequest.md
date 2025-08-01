# SignEvmHashRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**hash** | **str** | The arbitrary 32 byte hash to sign. | 

## Example

```python
from cdp.openapi_client.models.sign_evm_hash_request import SignEvmHashRequest

# TODO update the JSON string below
json = "{}"
# create an instance of SignEvmHashRequest from a JSON string
sign_evm_hash_request_instance = SignEvmHashRequest.from_json(json)
# print the JSON string representation of the object
print(SignEvmHashRequest.to_json())

# convert the object into a dict
sign_evm_hash_request_dict = sign_evm_hash_request_instance.to_dict()
# create an instance of SignEvmHashRequest from a dict
sign_evm_hash_request_from_dict = SignEvmHashRequest.from_dict(sign_evm_hash_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


