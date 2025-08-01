# EvmDataCriterion

A schema for specifying a criterion for the `data` field of an EVM transaction.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | **str** | The type of criterion to use. This should be &#x60;evmData&#x60;. | 
**abi** | [**EvmDataCriterionAbi**](EvmDataCriterionAbi.md) |  | 
**conditions** | [**List[EvmDataCondition]**](EvmDataCondition.md) | A list of conditions to apply against the function and encoded arguments in the transaction&#39;s &#x60;data&#x60; field. Each condition must be met in order for this policy to be accepted or rejected. | 

## Example

```python
from cdp.openapi_client.models.evm_data_criterion import EvmDataCriterion

# TODO update the JSON string below
json = "{}"
# create an instance of EvmDataCriterion from a JSON string
evm_data_criterion_instance = EvmDataCriterion.from_json(json)
# print the JSON string representation of the object
print(EvmDataCriterion.to_json())

# convert the object into a dict
evm_data_criterion_dict = evm_data_criterion_instance.to_dict()
# create an instance of EvmDataCriterion from a dict
evm_data_criterion_from_dict = EvmDataCriterion.from_dict(evm_data_criterion_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


