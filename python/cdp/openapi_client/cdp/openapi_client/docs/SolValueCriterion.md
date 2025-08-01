# SolValueCriterion

The criterion for the SOL value in lamports of a native transfer instruction in a Solana transaction.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | **str** | The type of criterion to use. This should be &#x60;solValue&#x60;. | 
**sol_value** | **str** | The amount of SOL in lamports that the transaction&#39;s &#x60;value&#x60; field should be compared to. | 
**operator** | **str** | The operator to use for the comparison. The transaction&#39;s &#x60;value&#x60; field will be on the left-hand side of the operator, and the &#x60;solValue&#x60; field will be on the right-hand side. | 

## Example

```python
from cdp.openapi_client.models.sol_value_criterion import SolValueCriterion

# TODO update the JSON string below
json = "{}"
# create an instance of SolValueCriterion from a JSON string
sol_value_criterion_instance = SolValueCriterion.from_json(json)
# print the JSON string representation of the object
print(SolValueCriterion.to_json())

# convert the object into a dict
sol_value_criterion_dict = sol_value_criterion_instance.to_dict()
# create an instance of SolValueCriterion from a dict
sol_value_criterion_from_dict = SolValueCriterion.from_dict(sol_value_criterion_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


