# EvmDataCondition

A single condition to apply against the function and encoded arguments in the transaction's `data` field. Each `parameter` configuration must be successfully evaluated against the corresponding function argument in order for a policy to be accepted.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**function** | **str** | The name of a smart contract function being called. | 
**params** | [**List[EvmDataConditionParamsInner]**](EvmDataConditionParamsInner.md) | An optional list of parameter conditions to apply against encoded arguments in the transaction&#39;s &#x60;data&#x60; field. | [optional] 

## Example

```python
from cdp.openapi_client.models.evm_data_condition import EvmDataCondition

# TODO update the JSON string below
json = "{}"
# create an instance of EvmDataCondition from a JSON string
evm_data_condition_instance = EvmDataCondition.from_json(json)
# print the JSON string representation of the object
print(EvmDataCondition.to_json())

# convert the object into a dict
evm_data_condition_dict = evm_data_condition_instance.to_dict()
# create an instance of EvmDataCondition from a dict
evm_data_condition_from_dict = EvmDataCondition.from_dict(evm_data_condition_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


