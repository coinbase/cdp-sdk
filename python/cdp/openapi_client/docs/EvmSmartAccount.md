# EvmSmartAccount


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**address** | **str** | The 0x-prefixed, checksum address of the Smart Account. | 
**owners** | **List[str]** | Today, only a single owner can be set for a Smart Account, but this is an array to allow having multiple owners in the future. The address is a 0x-prefixed, checksum address. | 
**name** | **str** | An optional name for the account. Account names can consist of alphanumeric characters and hyphens, and be between 2 and 36 characters long. Account names are guaranteed to be unique across all Smart Accounts in the developer&#39;s CDP Project. | [optional] 
**policies** | **List[str]** | The list of policy IDs that apply to the smart account. This will include both the project-level policy and the account-level policy, if one exists. | [optional] 
**created_at** | **datetime** | The UTC ISO 8601 timestamp at which the account was created. | [optional] 
**updated_at** | **datetime** | The UTC ISO 8601 timestamp at which the account was last updated. | [optional] 

## Example

```python
from cdp.openapi_client.models.evm_smart_account import EvmSmartAccount

# TODO update the JSON string below
json = "{}"
# create an instance of EvmSmartAccount from a JSON string
evm_smart_account_instance = EvmSmartAccount.from_json(json)
# print the JSON string representation of the object
print(EvmSmartAccount.to_json())

# convert the object into a dict
evm_smart_account_dict = evm_smart_account_instance.to_dict()
# create an instance of EvmSmartAccount from a dict
evm_smart_account_from_dict = EvmSmartAccount.from_dict(evm_smart_account_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


