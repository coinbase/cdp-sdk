# UpdateWalletSecretRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**public_key** | **str** | The base64 encoded public key of the new Wallet Secret. | 

## Example

```python
from cdp.openapi_client.models.update_wallet_secret_request import UpdateWalletSecretRequest

# TODO update the JSON string below
json = "{}"
# create an instance of UpdateWalletSecretRequest from a JSON string
update_wallet_secret_request_instance = UpdateWalletSecretRequest.from_json(json)
# print the JSON string representation of the object
print(UpdateWalletSecretRequest.to_json())

# convert the object into a dict
update_wallet_secret_request_dict = update_wallet_secret_request_instance.to_dict()
# create an instance of UpdateWalletSecretRequest from a dict
update_wallet_secret_request_from_dict = UpdateWalletSecretRequest.from_dict(update_wallet_secret_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


