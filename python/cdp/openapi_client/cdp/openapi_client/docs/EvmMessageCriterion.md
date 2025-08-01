# EvmMessageCriterion

A schema for specifying a criterion for the message being signed.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | **str** | The type of criterion to use. This should be &#x60;evmMessage&#x60;. | 
**match** | **str** | A regular expression the message is matched against. Accepts valid regular expression syntax described by [RE2](https://github.com/google/re2/wiki/Syntax). | 

## Example

```python
from cdp.openapi_client.models.evm_message_criterion import EvmMessageCriterion

# TODO update the JSON string below
json = "{}"
# create an instance of EvmMessageCriterion from a JSON string
evm_message_criterion_instance = EvmMessageCriterion.from_json(json)
# print the JSON string representation of the object
print(EvmMessageCriterion.to_json())

# convert the object into a dict
evm_message_criterion_dict = evm_message_criterion_instance.to_dict()
# create an instance of EvmMessageCriterion from a dict
evm_message_criterion_from_dict = EvmMessageCriterion.from_dict(evm_message_criterion_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


