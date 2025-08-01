# RegisterTemporaryWalletSecretRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**public_key** | **str** | The base64 encoded public key of the Temporary Wallet Secret. | 
**valid_until** | **str** | The date and time at which the Temporary Wallet Secret will expire in ISO 8601 format. | 
**wallet_secret_id** | **str** | A stable, unique identifier for the Temporary Wallet Secret. The &#x60;walletSecretId&#x60; must be unique across all end users in the developer&#39;s CDP Project. It must be between 1 and 100 characters long and can only contain alphanumeric characters and hyphens.  If &#x60;walletSecretId&#x60; is not provided in the request, the server will generate a random UUID.  This field can be used to replace a previously registered Temporary Wallet Secret. | [optional] 

## Example

```python
from cdp.openapi_client.models.register_temporary_wallet_secret_request import RegisterTemporaryWalletSecretRequest

# TODO update the JSON string below
json = "{}"
# create an instance of RegisterTemporaryWalletSecretRequest from a JSON string
register_temporary_wallet_secret_request_instance = RegisterTemporaryWalletSecretRequest.from_json(json)
# print the JSON string representation of the object
print(RegisterTemporaryWalletSecretRequest.to_json())

# convert the object into a dict
register_temporary_wallet_secret_request_dict = register_temporary_wallet_secret_request_instance.to_dict()
# create an instance of RegisterTemporaryWalletSecretRequest from a dict
register_temporary_wallet_secret_request_from_dict = RegisterTemporaryWalletSecretRequest.from_dict(register_temporary_wallet_secret_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


