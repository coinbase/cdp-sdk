# SendEvmTransactionWithEndUserAccount200Response


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**transaction_hash** | **str** | The hash of the transaction, as a 0x-prefixed hex string. | 

## Example

```python
from cdp.openapi_client.models.send_evm_transaction_with_end_user_account200_response import SendEvmTransactionWithEndUserAccount200Response

# TODO update the JSON string below
json = "{}"
# create an instance of SendEvmTransactionWithEndUserAccount200Response from a JSON string
send_evm_transaction_with_end_user_account200_response_instance = SendEvmTransactionWithEndUserAccount200Response.from_json(json)
# print the JSON string representation of the object
print(SendEvmTransactionWithEndUserAccount200Response.to_json())

# convert the object into a dict
send_evm_transaction_with_end_user_account200_response_dict = send_evm_transaction_with_end_user_account200_response_instance.to_dict()
# create an instance of SendEvmTransactionWithEndUserAccount200Response from a dict
send_evm_transaction_with_end_user_account200_response_from_dict = SendEvmTransactionWithEndUserAccount200Response.from_dict(send_evm_transaction_with_end_user_account200_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


