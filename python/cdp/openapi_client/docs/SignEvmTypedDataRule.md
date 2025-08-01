# SignEvmTypedDataRule


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**action** | **str** | Whether matching the rule will cause the request to be rejected or accepted. | 
**operation** | **str** | The operation to which the rule applies. Every element of the &#x60;criteria&#x60; array must match the specified operation. | 
**criteria** | [**List[SignEvmTypedDataCriteriaInner]**](SignEvmTypedDataCriteriaInner.md) | A schema for specifying criteria for the SignEvmTypedData operation. | 

## Example

```python
from cdp.openapi_client.models.sign_evm_typed_data_rule import SignEvmTypedDataRule

# TODO update the JSON string below
json = "{}"
# create an instance of SignEvmTypedDataRule from a JSON string
sign_evm_typed_data_rule_instance = SignEvmTypedDataRule.from_json(json)
# print the JSON string representation of the object
print(SignEvmTypedDataRule.to_json())

# convert the object into a dict
sign_evm_typed_data_rule_dict = sign_evm_typed_data_rule_instance.to_dict()
# create an instance of SignEvmTypedDataRule from a dict
sign_evm_typed_data_rule_from_dict = SignEvmTypedDataRule.from_dict(sign_evm_typed_data_rule_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


