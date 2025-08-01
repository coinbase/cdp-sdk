# SolAddressCriterion

The criterion for the recipient addresses of a Solana transaction.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | **str** | The type of criterion to use. This should be &#x60;solAddress&#x60;. | 
**addresses** | **List[str]** | The Solana addresses that are compared to the list of addresses in the transaction&#39;s &#x60;accountKeys&#x60; (for legacy transactions) or &#x60;staticAccountKeys&#x60; (for V0 transactions) array. | 
**operator** | **str** | The operator to use for the comparison. Each of the addresses in the transaction&#39;s &#x60;accountKeys&#x60; (for legacy transactions) or &#x60;staticAccountKeys&#x60; (for V0 transactions) array will be on the left-hand side of the operator, and the addresses field will be on the right-hand side. | 

## Example

```python
from cdp.openapi_client.models.sol_address_criterion import SolAddressCriterion

# TODO update the JSON string below
json = "{}"
# create an instance of SolAddressCriterion from a JSON string
sol_address_criterion_instance = SolAddressCriterion.from_json(json)
# print the JSON string representation of the object
print(SolAddressCriterion.to_json())

# convert the object into a dict
sol_address_criterion_dict = sol_address_criterion_instance.to_dict()
# create an instance of SolAddressCriterion from a dict
sol_address_criterion_from_dict = SolAddressCriterion.from_dict(sol_address_criterion_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


