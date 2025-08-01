# ImportEvmAccountRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**encrypted_private_key** | **str** | The base64-encoded, encrypted private key of the EVM account. The private key must be encrypted using the CDP SDK&#39;s encryption scheme. | 
**name** | **str** | An optional name for the account. Account names can consist of alphanumeric characters and hyphens, and be between 2 and 36 characters long. Account names must be unique across all EVM accounts in the developer&#39;s CDP Project. | [optional] 
**account_policy** | **str** | The ID of the account-level policy to apply to the account. | [optional] 

## Example

```python
from cdp.openapi_client.models.import_evm_account_request import ImportEvmAccountRequest

# TODO update the JSON string below
json = "{}"
# create an instance of ImportEvmAccountRequest from a JSON string
import_evm_account_request_instance = ImportEvmAccountRequest.from_json(json)
# print the JSON string representation of the object
print(ImportEvmAccountRequest.to_json())

# convert the object into a dict
import_evm_account_request_dict = import_evm_account_request_instance.to_dict()
# create an instance of ImportEvmAccountRequest from a dict
import_evm_account_request_from_dict = ImportEvmAccountRequest.from_dict(import_evm_account_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


