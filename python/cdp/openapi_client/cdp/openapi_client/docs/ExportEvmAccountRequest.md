# ExportEvmAccountRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**export_encryption_key** | **str** | The base64-encoded, public part of the RSA key in DER format used to encrypt the account private key. | 

## Example

```python
from cdp.openapi_client.models.export_evm_account_request import ExportEvmAccountRequest

# TODO update the JSON string below
json = "{}"
# create an instance of ExportEvmAccountRequest from a JSON string
export_evm_account_request_instance = ExportEvmAccountRequest.from_json(json)
# print the JSON string representation of the object
print(ExportEvmAccountRequest.to_json())

# convert the object into a dict
export_evm_account_request_dict = export_evm_account_request_instance.to_dict()
# create an instance of ExportEvmAccountRequest from a dict
export_evm_account_request_from_dict = ExportEvmAccountRequest.from_dict(export_evm_account_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


