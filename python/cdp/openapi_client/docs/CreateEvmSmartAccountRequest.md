# CreateEvmSmartAccountRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**owners** | **List[str]** | Today, only a single owner can be set for a Smart Account, but this is an array to allow setting multiple owners in the future. | 
**name** | **str** | An optional name for the account. Account names can consist of alphanumeric characters and hyphens, and be between 2 and 36 characters long. Account names must be unique across all EVM accounts in the developer&#39;s CDP Project. | [optional] 
**account_policy** | **str** | The ID of the account-level policy to apply to the smart account. | [optional] 

## Example

```python
from cdp.openapi_client.models.create_evm_smart_account_request import CreateEvmSmartAccountRequest

# TODO update the JSON string below
json = "{}"
# create an instance of CreateEvmSmartAccountRequest from a JSON string
create_evm_smart_account_request_instance = CreateEvmSmartAccountRequest.from_json(json)
# print the JSON string representation of the object
print(CreateEvmSmartAccountRequest.to_json())

# convert the object into a dict
create_evm_smart_account_request_dict = create_evm_smart_account_request_instance.to_dict()
# create an instance of CreateEvmSmartAccountRequest from a dict
create_evm_smart_account_request_from_dict = CreateEvmSmartAccountRequest.from_dict(create_evm_smart_account_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


