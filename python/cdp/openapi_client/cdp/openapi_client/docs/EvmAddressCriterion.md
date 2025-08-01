# EvmAddressCriterion

A schema for specifying a criterion for the `to` field of an EVM transaction.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | **str** | The type of criterion to use. This should be &#x60;evmAddress&#x60;. | 
**addresses** | **List[str]** | A list of 0x-prefixed EVM addresses that the transaction&#39;s &#x60;to&#x60; field should be compared to. There is a limit of 300 addresses per criterion. | 
**operator** | **str** | The operator to use for the comparison. The transaction&#39;s &#x60;to&#x60; field will be on the left-hand side of the operator, and the &#x60;addresses&#x60; field will be on the right-hand side. | 

## Example

```python
from cdp.openapi_client.models.evm_address_criterion import EvmAddressCriterion

# TODO update the JSON string below
json = "{}"
# create an instance of EvmAddressCriterion from a JSON string
evm_address_criterion_instance = EvmAddressCriterion.from_json(json)
# print the JSON string representation of the object
print(EvmAddressCriterion.to_json())

# convert the object into a dict
evm_address_criterion_dict = evm_address_criterion_instance.to_dict()
# create an instance of EvmAddressCriterion from a dict
evm_address_criterion_from_dict = EvmAddressCriterion.from_dict(evm_address_criterion_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


