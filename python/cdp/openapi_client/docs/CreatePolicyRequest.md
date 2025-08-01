# CreatePolicyRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**scope** | **str** | The scope of the policy. | 
**description** | **str** | An optional human-readable description for the policy. Policy descriptions can consist of alphanumeric characters, spaces, commas, and periods, and be 50 characters or less. | [optional] 
**rules** | [**List[Rule]**](Rule.md) | A list of rules that comprise the policy. There is a limit of 10 rules per policy. | 

## Example

```python
from cdp.openapi_client.models.create_policy_request import CreatePolicyRequest

# TODO update the JSON string below
json = "{}"
# create an instance of CreatePolicyRequest from a JSON string
create_policy_request_instance = CreatePolicyRequest.from_json(json)
# print the JSON string representation of the object
print(CreatePolicyRequest.to_json())

# convert the object into a dict
create_policy_request_dict = create_policy_request_instance.to_dict()
# create an instance of CreatePolicyRequest from a dict
create_policy_request_from_dict = CreatePolicyRequest.from_dict(create_policy_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


