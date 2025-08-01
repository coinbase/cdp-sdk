# AbiInner


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
**additional_properties** | **object** | For additional information on the ABI JSON specification, see [the Solidity documentation](https://docs.soliditylang.org/en/latest/abi-spec.html#json). | [optional] 

## Example

```python
from cdp.openapi_client.models.abi_inner import AbiInner

# TODO update the JSON string below
json = "{}"
# create an instance of AbiInner from a JSON string
abi_inner_instance = AbiInner.from_json(json)
# print the JSON string representation of the object
print(AbiInner.to_json())

# convert the object into a dict
abi_inner_dict = abi_inner_instance.to_dict()
# create an instance of AbiInner from a dict
abi_inner_from_dict = AbiInner.from_dict(abi_inner_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


