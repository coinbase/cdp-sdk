# SignEvmTypedDataWithEndUserAccountRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**address** | **str** | The 0x-prefixed address of the EVM account belonging to the end user. | 
**typed_data** | [**EIP712Message**](EIP712Message.md) |  | 
**wallet_secret_id** | **str** | The ID of the Temporary Wallet Secret that was used to sign the X-Wallet-Auth Header. | 

## Example

```python
from cdp.openapi_client.models.sign_evm_typed_data_with_end_user_account_request import SignEvmTypedDataWithEndUserAccountRequest

# TODO update the JSON string below
json = "{}"
# create an instance of SignEvmTypedDataWithEndUserAccountRequest from a JSON string
sign_evm_typed_data_with_end_user_account_request_instance = SignEvmTypedDataWithEndUserAccountRequest.from_json(json)
# print the JSON string representation of the object
print(SignEvmTypedDataWithEndUserAccountRequest.to_json())

# convert the object into a dict
sign_evm_typed_data_with_end_user_account_request_dict = sign_evm_typed_data_with_end_user_account_request_instance.to_dict()
# create an instance of SignEvmTypedDataWithEndUserAccountRequest from a dict
sign_evm_typed_data_with_end_user_account_request_from_dict = SignEvmTypedDataWithEndUserAccountRequest.from_dict(sign_evm_typed_data_with_end_user_account_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


