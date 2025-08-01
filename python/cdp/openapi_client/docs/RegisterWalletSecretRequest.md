# RegisterWalletSecretRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**public_key** | **str** | The base64 encoded public key of the Wallet Secret. | 

## Example

```python
from cdp.openapi_client.models.register_wallet_secret_request import RegisterWalletSecretRequest

# TODO update the JSON string below
json = "{}"
# create an instance of RegisterWalletSecretRequest from a JSON string
register_wallet_secret_request_instance = RegisterWalletSecretRequest.from_json(json)
# print the JSON string representation of the object
print(RegisterWalletSecretRequest.to_json())

# convert the object into a dict
register_wallet_secret_request_dict = register_wallet_secret_request_instance.to_dict()
# create an instance of RegisterWalletSecretRequest from a dict
register_wallet_secret_request_from_dict = RegisterWalletSecretRequest.from_dict(register_wallet_secret_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


