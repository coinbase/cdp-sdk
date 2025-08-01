# SendSolanaTransactionRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**network** | **str** | The Solana network to send the transaction to. | 
**transaction** | **str** | The base64 encoded transaction to sign and send. This transaction can contain multiple instructions for native Solana batching. | 

## Example

```python
from cdp.openapi_client.models.send_solana_transaction_request import SendSolanaTransactionRequest

# TODO update the JSON string below
json = "{}"
# create an instance of SendSolanaTransactionRequest from a JSON string
send_solana_transaction_request_instance = SendSolanaTransactionRequest.from_json(json)
# print the JSON string representation of the object
print(SendSolanaTransactionRequest.to_json())

# convert the object into a dict
send_solana_transaction_request_dict = send_solana_transaction_request_instance.to_dict()
# create an instance of SendSolanaTransactionRequest from a dict
send_solana_transaction_request_from_dict = SendSolanaTransactionRequest.from_dict(send_solana_transaction_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


