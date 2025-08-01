# SignEvmHashRule


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**action** | **str** | Whether any attempts to sign a hash will be accepted or rejected. This rule does not accept any criteria. | 
**operation** | **str** | The operation to which the rule applies. | 

## Example

```python
from cdp.openapi_client.models.sign_evm_hash_rule import SignEvmHashRule

# TODO update the JSON string below
json = "{}"
# create an instance of SignEvmHashRule from a JSON string
sign_evm_hash_rule_instance = SignEvmHashRule.from_json(json)
# print the JSON string representation of the object
print(SignEvmHashRule.to_json())

# convert the object into a dict
sign_evm_hash_rule_dict = sign_evm_hash_rule_instance.to_dict()
# create an instance of SignEvmHashRule from a dict
sign_evm_hash_rule_from_dict = SignEvmHashRule.from_dict(sign_evm_hash_rule_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


