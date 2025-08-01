# EvmTypedAddressCondition

A schema for specifying criterion for an address field of an EVM typed message. The address can be deeply nested within the typed data's message.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**addresses** | **List[str]** | A list of 0x-prefixed EVM addresses that the value located at the message&#39;s path should be compared to. There is a limit of 300 addresses per criterion. | 
**operator** | **str** | The operator to use for the comparison. The value located at the message&#39;s path will be on the left-hand side of the operator, and the &#x60;addresses&#x60; field will be on the right-hand side. | 
**path** | **str** | The path to the field to compare against this criterion. To reference deeply nested fields within the message, separate object keys by &#x60;.&#x60;, and access array values using &#x60;[index]&#x60;. If the field does not exist or is not an address, the operation will be rejected. | 

## Example

```python
from cdp.openapi_client.models.evm_typed_address_condition import EvmTypedAddressCondition

# TODO update the JSON string below
json = "{}"
# create an instance of EvmTypedAddressCondition from a JSON string
evm_typed_address_condition_instance = EvmTypedAddressCondition.from_json(json)
# print the JSON string representation of the object
print(EvmTypedAddressCondition.to_json())

# convert the object into a dict
evm_typed_address_condition_dict = evm_typed_address_condition_instance.to_dict()
# create an instance of EvmTypedAddressCondition from a dict
evm_typed_address_condition_from_dict = EvmTypedAddressCondition.from_dict(evm_typed_address_condition_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


