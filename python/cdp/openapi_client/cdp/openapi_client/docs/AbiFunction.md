# AbiFunction

ABI function type for contract functions.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | **str** | The type of the ABI item, must be &#x60;function&#x60;. | 
**name** | **str** | The name of the ABI function. | 
**inputs** | [**List[AbiParameter]**](AbiParameter.md) | The list of ABI parameters used for this function. | 
**outputs** | [**List[AbiParameter]**](AbiParameter.md) | The values returned by this function. | 
**constant** | **bool** | Deprecated. Use pure or view from stateMutability instead. | [optional] 
**payable** | **bool** | Deprecated. Use payable or nonpayable from &#x60;stateMutability&#x60; instead. | [optional] 
**state_mutability** | [**AbiStateMutability**](AbiStateMutability.md) |  | 
**gas** | **int** | Deprecated. Vyper used to provide gas estimates. | [optional] 

## Example

```python
from cdp.openapi_client.models.abi_function import AbiFunction

# TODO update the JSON string below
json = "{}"
# create an instance of AbiFunction from a JSON string
abi_function_instance = AbiFunction.from_json(json)
# print the JSON string representation of the object
print(AbiFunction.to_json())

# convert the object into a dict
abi_function_dict = abi_function_instance.to_dict()
# create an instance of AbiFunction from a dict
abi_function_from_dict = AbiFunction.from_dict(abi_function_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


