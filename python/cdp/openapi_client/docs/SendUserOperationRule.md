# SendUserOperationRule


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**action** | **str** | Whether matching the rule will cause the request to be rejected or accepted. | 
**operation** | **str** | The operation to which the rule applies. Every element of the &#x60;criteria&#x60; array must match the specified operation. | 
**criteria** | [**List[SignEvmTransactionCriteriaInner]**](SignEvmTransactionCriteriaInner.md) | A schema for specifying criteria for the SendUserOperation operation. | 

## Example

```python
from cdp.openapi_client.models.send_user_operation_rule import SendUserOperationRule

# TODO update the JSON string below
json = "{}"
# create an instance of SendUserOperationRule from a JSON string
send_user_operation_rule_instance = SendUserOperationRule.from_json(json)
# print the JSON string representation of the object
print(SendUserOperationRule.to_json())

# convert the object into a dict
send_user_operation_rule_dict = send_user_operation_rule_instance.to_dict()
# create an instance of SendUserOperationRule from a dict
send_user_operation_rule_from_dict = SendUserOperationRule.from_dict(send_user_operation_rule_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


