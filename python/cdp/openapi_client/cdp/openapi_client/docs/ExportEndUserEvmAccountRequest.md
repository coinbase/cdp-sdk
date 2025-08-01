# ExportEndUserEvmAccountRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**address** | **str** | The 0x-prefixed address of the EVM account belonging to the end user. | 
**export_encryption_key** | **str** | The base64-encoded, public part of the RSA key in DER format used to encrypt the account private key. | 
**wallet_secret_id** | **str** | The ID of the Temporary Wallet Secret that was used to sign the X-Wallet-Auth Header. | 

## Example

```python
from cdp.openapi_client.models.export_end_user_evm_account_request import ExportEndUserEvmAccountRequest

# TODO update the JSON string below
json = "{}"
# create an instance of ExportEndUserEvmAccountRequest from a JSON string
export_end_user_evm_account_request_instance = ExportEndUserEvmAccountRequest.from_json(json)
# print the JSON string representation of the object
print(ExportEndUserEvmAccountRequest.to_json())

# convert the object into a dict
export_end_user_evm_account_request_dict = export_end_user_evm_account_request_instance.to_dict()
# create an instance of ExportEndUserEvmAccountRequest from a dict
export_end_user_evm_account_request_from_dict = ExportEndUserEvmAccountRequest.from_dict(export_end_user_evm_account_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


