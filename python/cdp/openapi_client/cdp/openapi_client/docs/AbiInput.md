# AbiInput

Generic ABI item type encapsulating all other types besides `function`.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | **str** | The type of the ABI item. | 
**additional_properties** | **object** | For additional information on the ABI JSON specification, see [the Solidity documentation](https://docs.soliditylang.org/en/latest/abi-spec.html#json). | [optional] 

## Example

```python
from cdp.openapi_client.models.abi_input import AbiInput

# TODO update the JSON string below
json = "{}"
# create an instance of AbiInput from a JSON string
abi_input_instance = AbiInput.from_json(json)
# print the JSON string representation of the object
print(AbiInput.to_json())

# convert the object into a dict
abi_input_dict = abi_input_instance.to_dict()
# create an instance of AbiInput from a dict
abi_input_from_dict = AbiInput.from_dict(abi_input_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


