# EthValueCriterion

A schema for specifying a criterion for the `value` field of an EVM transaction.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | **str** | The type of criterion to use. This should be &#x60;ethValue&#x60;. | 
**eth_value** | **str** | The amount of ETH, in wei, that the transaction&#39;s &#x60;value&#x60; field should be compared to. | 
**operator** | **str** | The operator to use for the comparison. The transaction&#39;s &#x60;value&#x60; field will be on the left-hand side of the operator, and the &#x60;ethValue&#x60; field will be on the right-hand side. | 

## Example

```python
from cdp.openapi_client.models.eth_value_criterion import EthValueCriterion

# TODO update the JSON string below
json = "{}"
# create an instance of EthValueCriterion from a JSON string
eth_value_criterion_instance = EthValueCriterion.from_json(json)
# print the JSON string representation of the object
print(EthValueCriterion.to_json())

# convert the object into a dict
eth_value_criterion_dict = eth_value_criterion_instance.to_dict()
# create an instance of EthValueCriterion from a dict
eth_value_criterion_from_dict = EthValueCriterion.from_dict(eth_value_criterion_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


