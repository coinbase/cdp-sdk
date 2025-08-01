# EvmDataCriterionAbi

The ABI of the smart contract being called. This can be a partial structure with only specific functions.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------

## Example

```python
from cdp.openapi_client.models.evm_data_criterion_abi import EvmDataCriterionAbi

# TODO update the JSON string below
json = "{}"
# create an instance of EvmDataCriterionAbi from a JSON string
evm_data_criterion_abi_instance = EvmDataCriterionAbi.from_json(json)
# print the JSON string representation of the object
print(EvmDataCriterionAbi.to_json())

# convert the object into a dict
evm_data_criterion_abi_dict = evm_data_criterion_abi_instance.to_dict()
# create an instance of EvmDataCriterionAbi from a dict
evm_data_criterion_abi_from_dict = EvmDataCriterionAbi.from_dict(evm_data_criterion_abi_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


