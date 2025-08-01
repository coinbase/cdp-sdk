# AccountTokenAddressesResponse

Response containing token addresses that an account has received.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**account_address** | **str** | The account address that was queried. | [optional] 
**token_addresses** | **List[str]** | List of token contract addresses that the account has received. | [optional] 
**total_count** | **int** | Total number of unique token addresses discovered. | [optional] 

## Example

```python
from cdp.openapi_client.models.account_token_addresses_response import AccountTokenAddressesResponse

# TODO update the JSON string below
json = "{}"
# create an instance of AccountTokenAddressesResponse from a JSON string
account_token_addresses_response_instance = AccountTokenAddressesResponse.from_json(json)
# print the JSON string representation of the object
print(AccountTokenAddressesResponse.to_json())

# convert the object into a dict
account_token_addresses_response_dict = account_token_addresses_response_instance.to_dict()
# create an instance of AccountTokenAddressesResponse from a dict
account_token_addresses_response_from_dict = AccountTokenAddressesResponse.from_dict(account_token_addresses_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


