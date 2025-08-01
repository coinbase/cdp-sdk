# SignSolMessageRule


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**action** | **str** | Whether matching the rule will cause the request to be rejected or accepted. | 
**operation** | **str** | The operation to which the rule applies. Every element of the &#x60;criteria&#x60; array must match the specified operation. | 
**criteria** | [**List[SignSolMessageCriteriaInner]**](SignSolMessageCriteriaInner.md) | A schema for specifying criteria for the SignSolMessage operation. | 

## Example

```python
from cdp.openapi_client.models.sign_sol_message_rule import SignSolMessageRule

# TODO update the JSON string below
json = "{}"
# create an instance of SignSolMessageRule from a JSON string
sign_sol_message_rule_instance = SignSolMessageRule.from_json(json)
# print the JSON string representation of the object
print(SignSolMessageRule.to_json())

# convert the object into a dict
sign_sol_message_rule_dict = sign_sol_message_rule_instance.to_dict()
# create an instance of SignSolMessageRule from a dict
sign_sol_message_rule_from_dict = SignSolMessageRule.from_dict(sign_sol_message_rule_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


