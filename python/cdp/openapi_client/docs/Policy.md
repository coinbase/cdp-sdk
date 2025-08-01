# Policy


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **str** | The unique identifier for the policy. | 
**description** | **str** | An optional human-readable description of the policy. Policy descriptions can consist of alphanumeric characters, spaces, commas, and periods, and be 50 characters or less. | [optional] 
**scope** | **str** | The scope of the policy. Only one project-level policy can exist at any time. | 
**rules** | [**List[Rule]**](Rule.md) | A list of rules that comprise the policy. | 
**created_at** | **str** | The ISO 8601 timestamp at which the Policy was created. | 
**updated_at** | **str** | The ISO 8601 timestamp at which the Policy was last updated. | 

## Example

```python
from cdp.openapi_client.models.policy import Policy

# TODO update the JSON string below
json = "{}"
# create an instance of Policy from a JSON string
policy_instance = Policy.from_json(json)
# print the JSON string representation of the object
print(Policy.to_json())

# convert the object into a dict
policy_dict = policy_instance.to_dict()
# create an instance of Policy from a dict
policy_from_dict = Policy.from_dict(policy_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


