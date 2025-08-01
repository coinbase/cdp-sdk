# SignSolanaTransactionRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**transaction** | **str** | The base64 encoded transaction to sign. | 

## Example

```python
from cdp.openapi_client.models.sign_solana_transaction_request import SignSolanaTransactionRequest

# TODO update the JSON string below
json = "{}"
# create an instance of SignSolanaTransactionRequest from a JSON string
sign_solana_transaction_request_instance = SignSolanaTransactionRequest.from_json(json)
# print the JSON string representation of the object
print(SignSolanaTransactionRequest.to_json())

# convert the object into a dict
sign_solana_transaction_request_dict = sign_solana_transaction_request_instance.to_dict()
# create an instance of SignSolanaTransactionRequest from a dict
sign_solana_transaction_request_from_dict = SignSolanaTransactionRequest.from_dict(sign_solana_transaction_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


