# SolMessageCriterion

The criterion for the message of a Solana transaction.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | **str** | The type of criterion to use. This should be &#x60;solMessage&#x60;. | 
**match** | **str** | A regular expression the field is matched against. | 

## Example

```python
from cdp.openapi_client.models.sol_message_criterion import SolMessageCriterion

# TODO update the JSON string below
json = "{}"
# create an instance of SolMessageCriterion from a JSON string
sol_message_criterion_instance = SolMessageCriterion.from_json(json)
# print the JSON string representation of the object
print(SolMessageCriterion.to_json())

# convert the object into a dict
sol_message_criterion_dict = sol_message_criterion_instance.to_dict()
# create an instance of SolMessageCriterion from a dict
sol_message_criterion_from_dict = SolMessageCriterion.from_dict(sol_message_criterion_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


