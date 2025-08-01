# UpdatePolicyRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**description** | **str** | An optional human-readable description for the policy. Policy descriptions can consist of alphanumeric characters, spaces, commas, and periods, and be 50 characters or less. | [optional] 
**rules** | [**List[Rule]**](Rule.md) | A list of rules that comprise the policy. There is a limit of 10 rules per policy. | 

## Example

```python
from cdp.openapi_client.models.update_policy_request import UpdatePolicyRequest

# TODO update the JSON string below
json = "{}"
# create an instance of UpdatePolicyRequest from a JSON string
update_policy_request_instance = UpdatePolicyRequest.from_json(json)
# print the JSON string representation of the object
print(UpdatePolicyRequest.to_json())

# convert the object into a dict
update_policy_request_dict = update_policy_request_instance.to_dict()
# create an instance of UpdatePolicyRequest from a dict
update_policy_request_from_dict = UpdatePolicyRequest.from_dict(update_policy_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


