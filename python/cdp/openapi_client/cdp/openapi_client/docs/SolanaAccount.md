# SolanaAccount


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**address** | **str** | The base58 encoded Solana address. | 
**name** | **str** | An optional name for the account. Account names can consist of alphanumeric characters and hyphens, and be between 2 and 36 characters long. Account names are guaranteed to be unique across all Solana accounts in the developer&#39;s CDP Project. | [optional] 
**policies** | **List[str]** | The list of policy IDs that apply to the account. This will include both the project-level policy and the account-level policy, if one exists. | [optional] 
**created_at** | **datetime** | The ISO 8601 UTC timestamp at which the account was created. | [optional] 
**updated_at** | **datetime** | The ISO 8601 UTC timestamp at which the account was last updated. | [optional] 

## Example

```python
from cdp.openapi_client.models.solana_account import SolanaAccount

# TODO update the JSON string below
json = "{}"
# create an instance of SolanaAccount from a JSON string
solana_account_instance = SolanaAccount.from_json(json)
# print the JSON string representation of the object
print(SolanaAccount.to_json())

# convert the object into a dict
solana_account_dict = solana_account_instance.to_dict()
# create an instance of SolanaAccount from a dict
solana_account_from_dict = SolanaAccount.from_dict(solana_account_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


