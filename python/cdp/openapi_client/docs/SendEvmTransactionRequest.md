# SendEvmTransactionRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**network** | **str** | The network to send the transaction to. | 
**transaction** | **str** | The RLP-encoded transaction to sign and send, as a 0x-prefixed hex string. | 

## Example

```python
from cdp.openapi_client.models.send_evm_transaction_request import SendEvmTransactionRequest

# TODO update the JSON string below
json = "{}"
# create an instance of SendEvmTransactionRequest from a JSON string
send_evm_transaction_request_instance = SendEvmTransactionRequest.from_json(json)
# print the JSON string representation of the object
print(SendEvmTransactionRequest.to_json())

# convert the object into a dict
send_evm_transaction_request_dict = send_evm_transaction_request_instance.to_dict()
# create an instance of SendEvmTransactionRequest from a dict
send_evm_transaction_request_from_dict = SendEvmTransactionRequest.from_dict(send_evm_transaction_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


