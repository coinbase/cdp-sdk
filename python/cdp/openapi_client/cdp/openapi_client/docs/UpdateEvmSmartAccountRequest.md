# UpdateEvmSmartAccountRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **str** | An optional name for the smart account. Account names can consist of alphanumeric characters and hyphens, and be between 2 and 36 characters long. Account names must be unique across all EVM smart accounts in the developer&#39;s CDP Project. | [optional] 

## Example

```python
from cdp.openapi_client.models.update_evm_smart_account_request import UpdateEvmSmartAccountRequest

# TODO update the JSON string below
json = "{}"
# create an instance of UpdateEvmSmartAccountRequest from a JSON string
update_evm_smart_account_request_instance = UpdateEvmSmartAccountRequest.from_json(json)
# print the JSON string representation of the object
print(UpdateEvmSmartAccountRequest.to_json())

# convert the object into a dict
update_evm_smart_account_request_dict = update_evm_smart_account_request_instance.to_dict()
# create an instance of UpdateEvmSmartAccountRequest from a dict
update_evm_smart_account_request_from_dict = UpdateEvmSmartAccountRequest.from_dict(update_evm_smart_account_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


