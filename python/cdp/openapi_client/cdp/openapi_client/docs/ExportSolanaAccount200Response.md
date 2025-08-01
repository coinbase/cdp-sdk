# ExportSolanaAccount200Response


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**encrypted_private_key** | **str** | The base64-encoded, encrypted private key of the Solana account which is a 32 byte raw private key. The private key is encrypted in transport using the exportEncryptionKey in the request. | 

## Example

```python
from cdp.openapi_client.models.export_solana_account200_response import ExportSolanaAccount200Response

# TODO update the JSON string below
json = "{}"
# create an instance of ExportSolanaAccount200Response from a JSON string
export_solana_account200_response_instance = ExportSolanaAccount200Response.from_json(json)
# print the JSON string representation of the object
print(ExportSolanaAccount200Response.to_json())

# convert the object into a dict
export_solana_account200_response_dict = export_solana_account200_response_instance.to_dict()
# create an instance of ExportSolanaAccount200Response from a dict
export_solana_account200_response_from_dict = ExportSolanaAccount200Response.from_dict(export_solana_account200_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


