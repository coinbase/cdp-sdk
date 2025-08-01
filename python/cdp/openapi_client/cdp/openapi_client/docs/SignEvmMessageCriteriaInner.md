# SignEvmMessageCriteriaInner


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | **str** | The type of criterion to use. This should be &#x60;evmMessage&#x60;. | 
**match** | **str** | A regular expression the message is matched against. Accepts valid regular expression syntax described by [RE2](https://github.com/google/re2/wiki/Syntax). | 

## Example

```python
from cdp.openapi_client.models.sign_evm_message_criteria_inner import SignEvmMessageCriteriaInner

# TODO update the JSON string below
json = "{}"
# create an instance of SignEvmMessageCriteriaInner from a JSON string
sign_evm_message_criteria_inner_instance = SignEvmMessageCriteriaInner.from_json(json)
# print the JSON string representation of the object
print(SignEvmMessageCriteriaInner.to_json())

# convert the object into a dict
sign_evm_message_criteria_inner_dict = sign_evm_message_criteria_inner_instance.to_dict()
# create an instance of SignEvmMessageCriteriaInner from a dict
sign_evm_message_criteria_inner_from_dict = SignEvmMessageCriteriaInner.from_dict(sign_evm_message_criteria_inner_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


