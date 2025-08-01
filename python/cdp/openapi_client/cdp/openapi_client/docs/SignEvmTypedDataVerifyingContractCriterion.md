# SignEvmTypedDataVerifyingContractCriterion

A schema for specifying criterion for a domain's verifying contract.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | **str** | The type of criterion to use. This should be &#x60;evmTypedDataVerifyingContract&#x60;. | 
**addresses** | **List[str]** | A list of 0x-prefixed EVM addresses that the domain&#39;s verifying contract should be compared to. There is a limit of 300 addresses per criterion. | 
**operator** | **str** | The operator to use for the comparison. The domain&#39;s verifying contract will be on the left-hand side of the operator, and the &#x60;addresses&#x60; field will be on the right-hand side. | 

## Example

```python
from cdp.openapi_client.models.sign_evm_typed_data_verifying_contract_criterion import SignEvmTypedDataVerifyingContractCriterion

# TODO update the JSON string below
json = "{}"
# create an instance of SignEvmTypedDataVerifyingContractCriterion from a JSON string
sign_evm_typed_data_verifying_contract_criterion_instance = SignEvmTypedDataVerifyingContractCriterion.from_json(json)
# print the JSON string representation of the object
print(SignEvmTypedDataVerifyingContractCriterion.to_json())

# convert the object into a dict
sign_evm_typed_data_verifying_contract_criterion_dict = sign_evm_typed_data_verifying_contract_criterion_instance.to_dict()
# create an instance of SignEvmTypedDataVerifyingContractCriterion from a dict
sign_evm_typed_data_verifying_contract_criterion_from_dict = SignEvmTypedDataVerifyingContractCriterion.from_dict(sign_evm_typed_data_verifying_contract_criterion_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


