# SignEvmTypedDataFieldCriterion


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | **str** | The type of criterion to use. This should be &#x60;evmTypedDataField&#x60;. | 
**types** | [**SignEvmTypedDataFieldCriterionTypes**](SignEvmTypedDataFieldCriterionTypes.md) |  | 
**conditions** | [**List[SignEvmTypedDataFieldCriterionConditionsInner]**](SignEvmTypedDataFieldCriterionConditionsInner.md) | A list of conditions to check against the data being signed. Each condition must be met for the rule to take effect. | 

## Example

```python
from cdp.openapi_client.models.sign_evm_typed_data_field_criterion import SignEvmTypedDataFieldCriterion

# TODO update the JSON string below
json = "{}"
# create an instance of SignEvmTypedDataFieldCriterion from a JSON string
sign_evm_typed_data_field_criterion_instance = SignEvmTypedDataFieldCriterion.from_json(json)
# print the JSON string representation of the object
print(SignEvmTypedDataFieldCriterion.to_json())

# convert the object into a dict
sign_evm_typed_data_field_criterion_dict = sign_evm_typed_data_field_criterion_instance.to_dict()
# create an instance of SignEvmTypedDataFieldCriterion from a dict
sign_evm_typed_data_field_criterion_from_dict = SignEvmTypedDataFieldCriterion.from_dict(sign_evm_typed_data_field_criterion_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


