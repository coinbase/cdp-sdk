# EvmDataParameterConditionList


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **str** | The name of the parameter to check against a transaction&#39;s calldata. If name is unknown, or is not named, you may supply an array index, e.g., &#x60;0&#x60; for first parameter. | 
**operator** | **str** | The operator to use for the comparison. The value resolved at the &#x60;name&#x60; will be on the left-hand side of the operator, and the &#x60;values&#x60; field will be on the right-hand side. | 
**values** | **List[str]** | Values to compare against the resolved &#x60;name&#x60; value. All values are encoded as strings. Refer to the table in the documentation for how values should be encoded, and which operators are supported for each type. | 

## Example

```python
from cdp.openapi_client.models.evm_data_parameter_condition_list import EvmDataParameterConditionList

# TODO update the JSON string below
json = "{}"
# create an instance of EvmDataParameterConditionList from a JSON string
evm_data_parameter_condition_list_instance = EvmDataParameterConditionList.from_json(json)
# print the JSON string representation of the object
print(EvmDataParameterConditionList.to_json())

# convert the object into a dict
evm_data_parameter_condition_list_dict = evm_data_parameter_condition_list_instance.to_dict()
# create an instance of EvmDataParameterConditionList from a dict
evm_data_parameter_condition_list_from_dict = EvmDataParameterConditionList.from_dict(evm_data_parameter_condition_list_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


