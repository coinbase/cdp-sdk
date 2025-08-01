# SignEvmTypedDataFieldCriterionTypes

An object containing EIP-712 type definitions, as well as a primary type for the root message object.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**types** | **Dict[str, List[SignEvmTypedDataFieldCriterionTypesTypesValueInner]]** | EIP-712 compliant map of model names to model definitions. | 
**primary_type** | **str** | The name of the root EIP-712 type. This value must be included in the &#x60;types&#x60; object. | 

## Example

```python
from cdp.openapi_client.models.sign_evm_typed_data_field_criterion_types import SignEvmTypedDataFieldCriterionTypes

# TODO update the JSON string below
json = "{}"
# create an instance of SignEvmTypedDataFieldCriterionTypes from a JSON string
sign_evm_typed_data_field_criterion_types_instance = SignEvmTypedDataFieldCriterionTypes.from_json(json)
# print the JSON string representation of the object
print(SignEvmTypedDataFieldCriterionTypes.to_json())

# convert the object into a dict
sign_evm_typed_data_field_criterion_types_dict = sign_evm_typed_data_field_criterion_types_instance.to_dict()
# create an instance of SignEvmTypedDataFieldCriterionTypes from a dict
sign_evm_typed_data_field_criterion_types_from_dict = SignEvmTypedDataFieldCriterionTypes.from_dict(sign_evm_typed_data_field_criterion_types_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


