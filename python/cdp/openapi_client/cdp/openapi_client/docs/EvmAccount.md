# EvmAccount


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**address** | **str** | The 0x-prefixed, checksum EVM address. | 
**name** | **str** | An optional name for the account. Account names can consist of alphanumeric characters and hyphens, and be between 2 and 36 characters long. Account names are guaranteed to be unique across all EVM accounts in the developer&#39;s CDP Project. | [optional] 
**policies** | **List[str]** | The list of policy IDs that apply to the account. This will include both the project-level policy and the account-level policy, if one exists. | [optional] 
**created_at** | **datetime** | The UTC ISO 8601 timestamp at which the account was created. | [optional] 
**updated_at** | **datetime** | The UTC ISO 8601 timestamp at which the account was last updated. | [optional] 

## Example

```python
from cdp.openapi_client.models.evm_account import EvmAccount

# TODO update the JSON string below
json = "{}"
# create an instance of EvmAccount from a JSON string
evm_account_instance = EvmAccount.from_json(json)
# print the JSON string representation of the object
print(EvmAccount.to_json())

# convert the object into a dict
evm_account_dict = evm_account_instance.to_dict()
# create an instance of EvmAccount from a dict
evm_account_from_dict = EvmAccount.from_dict(evm_account_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


