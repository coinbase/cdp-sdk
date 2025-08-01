# AbiParameter

Parameter definition for ABI functions, errors, and constructors.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **str** | The name of the parameter. | [optional] 
**type** | **str** | The canonical type of the parameter. | 
**internal_type** | **str** | The internal Solidity type used by the compiler. | [optional] 
**components** | [**List[AbiParameter]**](AbiParameter.md) | Used for tuple types. | [optional] 

## Example

```python
from cdp.openapi_client.models.abi_parameter import AbiParameter

# TODO update the JSON string below
json = "{}"
# create an instance of AbiParameter from a JSON string
abi_parameter_instance = AbiParameter.from_json(json)
# print the JSON string representation of the object
print(AbiParameter.to_json())

# convert the object into a dict
abi_parameter_dict = abi_parameter_instance.to_dict()
# create an instance of AbiParameter from a dict
abi_parameter_from_dict = AbiParameter.from_dict(abi_parameter_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


