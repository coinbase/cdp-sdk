# EvmTypedStringCondition

A schema for specifying criterion for a string field of an EVM typed message. The value can be deeply nested within the typed data's message.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**match** | **str** | A regular expression the field is matched against. | 
**path** | **str** | The path to the field to compare against this criterion. To reference deeply nested fields within the message, separate object keys by &#x60;.&#x60;, and access array values using &#x60;[index]&#x60;. If the field does not exist or is not an address, the operation will be rejected. | 

## Example

```python
from cdp.openapi_client.models.evm_typed_string_condition import EvmTypedStringCondition

# TODO update the JSON string below
json = "{}"
# create an instance of EvmTypedStringCondition from a JSON string
evm_typed_string_condition_instance = EvmTypedStringCondition.from_json(json)
# print the JSON string representation of the object
print(EvmTypedStringCondition.to_json())

# convert the object into a dict
evm_typed_string_condition_dict = evm_typed_string_condition_instance.to_dict()
# create an instance of EvmTypedStringCondition from a dict
evm_typed_string_condition_from_dict = EvmTypedStringCondition.from_dict(evm_typed_string_condition_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


