# SignEvmTransactionWithEndUserAccount200Response


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**signed_transaction** | **str** | The RLP-encoded signed transaction, as a 0x-prefixed hex string. | 

## Example

```python
from cdp.openapi_client.models.sign_evm_transaction_with_end_user_account200_response import SignEvmTransactionWithEndUserAccount200Response

# TODO update the JSON string below
json = "{}"
# create an instance of SignEvmTransactionWithEndUserAccount200Response from a JSON string
sign_evm_transaction_with_end_user_account200_response_instance = SignEvmTransactionWithEndUserAccount200Response.from_json(json)
# print the JSON string representation of the object
print(SignEvmTransactionWithEndUserAccount200Response.to_json())

# convert the object into a dict
sign_evm_transaction_with_end_user_account200_response_dict = sign_evm_transaction_with_end_user_account200_response_instance.to_dict()
# create an instance of SignEvmTransactionWithEndUserAccount200Response from a dict
sign_evm_transaction_with_end_user_account200_response_from_dict = SignEvmTransactionWithEndUserAccount200Response.from_dict(sign_evm_transaction_with_end_user_account200_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


