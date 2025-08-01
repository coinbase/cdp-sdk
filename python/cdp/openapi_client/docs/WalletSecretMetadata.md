# WalletSecretMetadata


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**updated_at** | **str** | The ISO 8601 timestamp at which the Wallet Secret was last updated. | 

## Example

```python
from cdp.openapi_client.models.wallet_secret_metadata import WalletSecretMetadata

# TODO update the JSON string below
json = "{}"
# create an instance of WalletSecretMetadata from a JSON string
wallet_secret_metadata_instance = WalletSecretMetadata.from_json(json)
# print the JSON string representation of the object
print(WalletSecretMetadata.to_json())

# convert the object into a dict
wallet_secret_metadata_dict = wallet_secret_metadata_instance.to_dict()
# create an instance of WalletSecretMetadata from a dict
wallet_secret_metadata_from_dict = WalletSecretMetadata.from_dict(wallet_secret_metadata_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


