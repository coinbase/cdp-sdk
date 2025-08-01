# RegisterTemporaryWalletSecret200Response


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**wallet_secret_id** | **str** | A stable, unique identifier for the Temporary Wallet Secret. | 
**valid_until** | **datetime** | The date and time at which the Temporary Wallet Secret will expire in ISO 8601 format. | 

## Example

```python
from cdp.openapi_client.models.register_temporary_wallet_secret200_response import RegisterTemporaryWalletSecret200Response

# TODO update the JSON string below
json = "{}"
# create an instance of RegisterTemporaryWalletSecret200Response from a JSON string
register_temporary_wallet_secret200_response_instance = RegisterTemporaryWalletSecret200Response.from_json(json)
# print the JSON string representation of the object
print(RegisterTemporaryWalletSecret200Response.to_json())

# convert the object into a dict
register_temporary_wallet_secret200_response_dict = register_temporary_wallet_secret200_response_instance.to_dict()
# create an instance of RegisterTemporaryWalletSecret200Response from a dict
register_temporary_wallet_secret200_response_from_dict = RegisterTemporaryWalletSecret200Response.from_dict(register_temporary_wallet_secret200_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


