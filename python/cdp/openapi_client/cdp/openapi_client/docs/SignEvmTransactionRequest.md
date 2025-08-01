# SignEvmTransactionRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**transaction** | **str** | The RLP-encoded transaction to sign, as a 0x-prefixed hex string. | 

## Example

```python
from cdp.openapi_client.models.sign_evm_transaction_request import SignEvmTransactionRequest

# TODO update the JSON string below
json = "{}"
# create an instance of SignEvmTransactionRequest from a JSON string
sign_evm_transaction_request_instance = SignEvmTransactionRequest.from_json(json)
# print the JSON string representation of the object
print(SignEvmTransactionRequest.to_json())

# convert the object into a dict
sign_evm_transaction_request_dict = sign_evm_transaction_request_instance.to_dict()
# create an instance of SignEvmTransactionRequest from a dict
sign_evm_transaction_request_from_dict = SignEvmTransactionRequest.from_dict(sign_evm_transaction_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


