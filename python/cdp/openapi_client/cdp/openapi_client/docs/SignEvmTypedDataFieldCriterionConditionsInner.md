# SignEvmTypedDataFieldCriterionConditionsInner


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**addresses** | **List[str]** | A list of 0x-prefixed EVM addresses that the value located at the message&#39;s path should be compared to. There is a limit of 300 addresses per criterion. | 
**operator** | **str** | The operator to use for the comparison. The value located at the message&#39;s path will be on the left-hand side of the operator, and the &#x60;value&#x60; field will be on the right-hand side. | 
**path** | **str** | The path to the field to compare against this criterion. To reference deeply nested fields within the message, separate object keys by &#x60;.&#x60;, and access array values using &#x60;[index]&#x60;. If the field does not exist or is not an address, the operation will be rejected. | 
**value** | **str** | The amount that the value located at the message&#39;s path should be compared to. | 
**match** | **str** | A regular expression the field is matched against. | 

## Example

```python
from cdp.openapi_client.models.sign_evm_typed_data_field_criterion_conditions_inner import SignEvmTypedDataFieldCriterionConditionsInner

# TODO update the JSON string below
json = "{}"
# create an instance of SignEvmTypedDataFieldCriterionConditionsInner from a JSON string
sign_evm_typed_data_field_criterion_conditions_inner_instance = SignEvmTypedDataFieldCriterionConditionsInner.from_json(json)
# print the JSON string representation of the object
print(SignEvmTypedDataFieldCriterionConditionsInner.to_json())

# convert the object into a dict
sign_evm_typed_data_field_criterion_conditions_inner_dict = sign_evm_typed_data_field_criterion_conditions_inner_instance.to_dict()
# create an instance of SignEvmTypedDataFieldCriterionConditionsInner from a dict
sign_evm_typed_data_field_criterion_conditions_inner_from_dict = SignEvmTypedDataFieldCriterionConditionsInner.from_dict(sign_evm_typed_data_field_criterion_conditions_inner_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


