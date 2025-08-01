# SignEvmHashWithEndUserAccountRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**hash** | **str** | The arbitrary 32 byte hash to sign. | 
**address** | **str** | The 0x-prefixed address of the EVM account belonging to the end user. | 
**wallet_secret_id** | **str** | The ID of the Temporary Wallet Secret that was used to sign the X-Wallet-Auth Header. | 

## Example

```python
from cdp.openapi_client.models.sign_evm_hash_with_end_user_account_request import SignEvmHashWithEndUserAccountRequest

# TODO update the JSON string below
json = "{}"
# create an instance of SignEvmHashWithEndUserAccountRequest from a JSON string
sign_evm_hash_with_end_user_account_request_instance = SignEvmHashWithEndUserAccountRequest.from_json(json)
# print the JSON string representation of the object
print(SignEvmHashWithEndUserAccountRequest.to_json())

# convert the object into a dict
sign_evm_hash_with_end_user_account_request_dict = sign_evm_hash_with_end_user_account_request_instance.to_dict()
# create an instance of SignEvmHashWithEndUserAccountRequest from a dict
sign_evm_hash_with_end_user_account_request_from_dict = SignEvmHashWithEndUserAccountRequest.from_dict(sign_evm_hash_with_end_user_account_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


