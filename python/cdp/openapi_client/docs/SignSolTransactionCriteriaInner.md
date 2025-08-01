# SignSolTransactionCriteriaInner


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | **str** | The type of criterion to use. This should be &#x60;solAddress&#x60;. | 
**addresses** | **List[str]** | The Solana addresses that are compared to the list of addresses in the transaction&#39;s &#x60;accountKeys&#x60; (for legacy transactions) or &#x60;staticAccountKeys&#x60; (for V0 transactions) array. | 
**operator** | **str** | The operator to use for the comparison. The transaction&#39;s &#x60;value&#x60; field will be on the left-hand side of the operator, and the &#x60;solValue&#x60; field will be on the right-hand side. | 
**sol_value** | **str** | The amount of SOL in lamports that the transaction&#39;s &#x60;value&#x60; field should be compared to. | 

## Example

```python
from cdp.openapi_client.models.sign_sol_transaction_criteria_inner import SignSolTransactionCriteriaInner

# TODO update the JSON string below
json = "{}"
# create an instance of SignSolTransactionCriteriaInner from a JSON string
sign_sol_transaction_criteria_inner_instance = SignSolTransactionCriteriaInner.from_json(json)
# print the JSON string representation of the object
print(SignSolTransactionCriteriaInner.to_json())

# convert the object into a dict
sign_sol_transaction_criteria_inner_dict = sign_sol_transaction_criteria_inner_instance.to_dict()
# create an instance of SignSolTransactionCriteriaInner from a dict
sign_sol_transaction_criteria_inner_from_dict = SignSolTransactionCriteriaInner.from_dict(sign_sol_transaction_criteria_inner_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


