# PrepareUserOperationRule


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**action** | **str** | Whether matching the rule will cause the request to be rejected or accepted. | 
**operation** | **str** | The operation to which the rule applies. Every element of the &#x60;criteria&#x60; array must match the specified operation. | 
**criteria** | [**List[SendEvmTransactionCriteriaInner]**](SendEvmTransactionCriteriaInner.md) | A schema for specifying criteria for the PrepareUserOperation operation. | 

## Example

```python
from cdp.openapi_client.models.prepare_user_operation_rule import PrepareUserOperationRule

# TODO update the JSON string below
json = "{}"
# create an instance of PrepareUserOperationRule from a JSON string
prepare_user_operation_rule_instance = PrepareUserOperationRule.from_json(json)
# print the JSON string representation of the object
print(PrepareUserOperationRule.to_json())

# convert the object into a dict
prepare_user_operation_rule_dict = prepare_user_operation_rule_instance.to_dict()
# create an instance of PrepareUserOperationRule from a dict
prepare_user_operation_rule_from_dict = PrepareUserOperationRule.from_dict(prepare_user_operation_rule_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


