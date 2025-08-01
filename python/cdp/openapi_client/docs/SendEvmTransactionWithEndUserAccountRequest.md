# SendEvmTransactionWithEndUserAccountRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**address** | **str** | The 0x-prefixed address of the EVM account belonging to the end user. | 
**network** | **str** | The network to send the transaction to. | 
**wallet_secret_id** | **str** | The ID of the Temporary Wallet Secret that was used to sign the X-Wallet-Auth Header. | 
**transaction** | **str** | The RLP-encoded transaction to sign and send, as a 0x-prefixed hex string. | 

## Example

```python
from cdp.openapi_client.models.send_evm_transaction_with_end_user_account_request import SendEvmTransactionWithEndUserAccountRequest

# TODO update the JSON string below
json = "{}"
# create an instance of SendEvmTransactionWithEndUserAccountRequest from a JSON string
send_evm_transaction_with_end_user_account_request_instance = SendEvmTransactionWithEndUserAccountRequest.from_json(json)
# print the JSON string representation of the object
print(SendEvmTransactionWithEndUserAccountRequest.to_json())

# convert the object into a dict
send_evm_transaction_with_end_user_account_request_dict = send_evm_transaction_with_end_user_account_request_instance.to_dict()
# create an instance of SendEvmTransactionWithEndUserAccountRequest from a dict
send_evm_transaction_with_end_user_account_request_from_dict = SendEvmTransactionWithEndUserAccountRequest.from_dict(send_evm_transaction_with_end_user_account_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


