# SignEvmTypedDataCriteriaInner


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | **str** | The type of criterion to use. This should be &#x60;evmTypedDataField&#x60;. | 
**types** | [**SignEvmTypedDataFieldCriterionTypes**](SignEvmTypedDataFieldCriterionTypes.md) |  | 
**conditions** | [**List[SignEvmTypedDataFieldCriterionConditionsInner]**](SignEvmTypedDataFieldCriterionConditionsInner.md) | A list of conditions to check against the data being signed. Each condition must be met for the rule to take effect. | 
**addresses** | **List[str]** | A list of 0x-prefixed EVM addresses that the domain&#39;s verifying contract should be compared to. There is a limit of 300 addresses per criterion. | 
**operator** | **str** | The operator to use for the comparison. The total value of a transaction&#39;s asset transfer will be on the left-hand side of the operator, and the &#x60;changeCents&#x60; field will be on the right-hand side. | 
**change_cents** | **int** | The amount of USD, in cents, that the total value of a transaction&#39;s asset transfer should be compared to. | 

## Example

```python
from cdp.openapi_client.models.sign_evm_typed_data_criteria_inner import SignEvmTypedDataCriteriaInner

# TODO update the JSON string below
json = "{}"
# create an instance of SignEvmTypedDataCriteriaInner from a JSON string
sign_evm_typed_data_criteria_inner_instance = SignEvmTypedDataCriteriaInner.from_json(json)
# print the JSON string representation of the object
print(SignEvmTypedDataCriteriaInner.to_json())

# convert the object into a dict
sign_evm_typed_data_criteria_inner_dict = sign_evm_typed_data_criteria_inner_instance.to_dict()
# create an instance of SignEvmTypedDataCriteriaInner from a dict
sign_evm_typed_data_criteria_inner_from_dict = SignEvmTypedDataCriteriaInner.from_dict(sign_evm_typed_data_criteria_inner_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


