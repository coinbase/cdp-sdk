# EvmNetworkCriterion

A schema for specifying a criterion for the intended `network` of an EVM transaction.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | **str** | The type of criterion to use. This should be &#x60;evmNetwork&#x60;. | 
**networks** | **List[str]** | A list of EVM network identifiers that the transaction&#39;s intended &#x60;network&#x60; should be compared to. | 
**operator** | **str** | The operator to use for the comparison. The transaction&#39;s intended &#x60;network&#x60; will be on the left-hand side of the operator, and the &#x60;networks&#x60; field will be on the right-hand side. | 

## Example

```python
from cdp.openapi_client.models.evm_network_criterion import EvmNetworkCriterion

# TODO update the JSON string below
json = "{}"
# create an instance of EvmNetworkCriterion from a JSON string
evm_network_criterion_instance = EvmNetworkCriterion.from_json(json)
# print the JSON string representation of the object
print(EvmNetworkCriterion.to_json())

# convert the object into a dict
evm_network_criterion_dict = evm_network_criterion_instance.to_dict()
# create an instance of EvmNetworkCriterion from a dict
evm_network_criterion_from_dict = EvmNetworkCriterion.from_dict(evm_network_criterion_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


