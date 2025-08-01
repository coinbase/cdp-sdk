# UpdateEvmAccountPolicyRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**account_policy** | **str** | The ID of the account-level policy to apply to the account, or an empty string to unset attached policy. | [optional] 

## Example

```python
from cdp.openapi_client.models.update_evm_account_policy_request import UpdateEvmAccountPolicyRequest

# TODO update the JSON string below
json = "{}"
# create an instance of UpdateEvmAccountPolicyRequest from a JSON string
update_evm_account_policy_request_instance = UpdateEvmAccountPolicyRequest.from_json(json)
# print the JSON string representation of the object
print(UpdateEvmAccountPolicyRequest.to_json())

# convert the object into a dict
update_evm_account_policy_request_dict = update_evm_account_policy_request_instance.to_dict()
# create an instance of UpdateEvmAccountPolicyRequest from a dict
update_evm_account_policy_request_from_dict = UpdateEvmAccountPolicyRequest.from_dict(update_evm_account_policy_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


