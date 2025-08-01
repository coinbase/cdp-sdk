# SignEvmMessageRule


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**action** | **str** | Whether matching the rule will cause the request to be rejected or accepted. | 
**operation** | **str** | The operation to which the rule applies. Every element of the &#x60;criteria&#x60; array must match the specified operation. | 
**criteria** | [**List[SignEvmMessageCriteriaInner]**](SignEvmMessageCriteriaInner.md) | A schema for specifying the rejection criteria for the SignEvmMessage operation. | 

## Example

```python
from cdp.openapi_client.models.sign_evm_message_rule import SignEvmMessageRule

# TODO update the JSON string below
json = "{}"
# create an instance of SignEvmMessageRule from a JSON string
sign_evm_message_rule_instance = SignEvmMessageRule.from_json(json)
# print the JSON string representation of the object
print(SignEvmMessageRule.to_json())

# convert the object into a dict
sign_evm_message_rule_dict = sign_evm_message_rule_instance.to_dict()
# create an instance of SignEvmMessageRule from a dict
sign_evm_message_rule_from_dict = SignEvmMessageRule.from_dict(sign_evm_message_rule_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


