# UpdateSolanaAccountPolicyRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**account_policy** | **str** | The ID of the account-level policy to apply to the account, or an empty string to unset attached policy. | [optional] 

## Example

```python
from cdp.openapi_client.models.update_solana_account_policy_request import UpdateSolanaAccountPolicyRequest

# TODO update the JSON string below
json = "{}"
# create an instance of UpdateSolanaAccountPolicyRequest from a JSON string
update_solana_account_policy_request_instance = UpdateSolanaAccountPolicyRequest.from_json(json)
# print the JSON string representation of the object
print(UpdateSolanaAccountPolicyRequest.to_json())

# convert the object into a dict
update_solana_account_policy_request_dict = update_solana_account_policy_request_instance.to_dict()
# create an instance of UpdateSolanaAccountPolicyRequest from a dict
update_solana_account_policy_request_from_dict = UpdateSolanaAccountPolicyRequest.from_dict(update_solana_account_policy_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


