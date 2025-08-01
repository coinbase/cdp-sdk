# SignSolTransactionRule


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**action** | **str** | Whether matching the rule will cause the request to be rejected or accepted. | 
**operation** | **str** | The operation to which the rule applies. Every element of the &#x60;criteria&#x60; array must match the specified operation. | 
**criteria** | [**List[SignSolTransactionCriteriaInner]**](SignSolTransactionCriteriaInner.md) | A schema for specifying criteria for the SignSolTransaction operation. | 

## Example

```python
from cdp.openapi_client.models.sign_sol_transaction_rule import SignSolTransactionRule

# TODO update the JSON string below
json = "{}"
# create an instance of SignSolTransactionRule from a JSON string
sign_sol_transaction_rule_instance = SignSolTransactionRule.from_json(json)
# print the JSON string representation of the object
print(SignSolTransactionRule.to_json())

# convert the object into a dict
sign_sol_transaction_rule_dict = sign_sol_transaction_rule_instance.to_dict()
# create an instance of SignSolTransactionRule from a dict
sign_sol_transaction_rule_from_dict = SignSolTransactionRule.from_dict(sign_sol_transaction_rule_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


