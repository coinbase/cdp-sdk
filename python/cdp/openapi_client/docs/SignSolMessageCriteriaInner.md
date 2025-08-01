# SignSolMessageCriteriaInner


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | **str** | The type of criterion to use. This should be &#x60;solMessage&#x60;. | 
**match** | **str** | A regular expression the field is matched against. | 

## Example

```python
from cdp.openapi_client.models.sign_sol_message_criteria_inner import SignSolMessageCriteriaInner

# TODO update the JSON string below
json = "{}"
# create an instance of SignSolMessageCriteriaInner from a JSON string
sign_sol_message_criteria_inner_instance = SignSolMessageCriteriaInner.from_json(json)
# print the JSON string representation of the object
print(SignSolMessageCriteriaInner.to_json())

# convert the object into a dict
sign_sol_message_criteria_inner_dict = sign_sol_message_criteria_inner_instance.to_dict()
# create an instance of SignSolMessageCriteriaInner from a dict
sign_sol_message_criteria_inner_from_dict = SignSolMessageCriteriaInner.from_dict(sign_sol_message_criteria_inner_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


