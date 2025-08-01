# CreateSolanaAccountRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **str** | An optional name for the account. Account names can consist of alphanumeric characters and hyphens, and be between 2 and 36 characters long. Account names must be unique across all Solana accounts in the developer&#39;s CDP Project. | [optional] 
**account_policy** | **str** | The ID of the account-level policy to apply to the account. | [optional] 

## Example

```python
from cdp.openapi_client.models.create_solana_account_request import CreateSolanaAccountRequest

# TODO update the JSON string below
json = "{}"
# create an instance of CreateSolanaAccountRequest from a JSON string
create_solana_account_request_instance = CreateSolanaAccountRequest.from_json(json)
# print the JSON string representation of the object
print(CreateSolanaAccountRequest.to_json())

# convert the object into a dict
create_solana_account_request_dict = create_solana_account_request_instance.to_dict()
# create an instance of CreateSolanaAccountRequest from a dict
create_solana_account_request_from_dict = CreateSolanaAccountRequest.from_dict(create_solana_account_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


