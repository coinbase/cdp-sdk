# CreateSwapQuoteResponseAllOfTransaction

The details of the transaction to be signed and submitted to execute the swap.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**to** | **str** | The 0x-prefixed address of the contract to call. | 
**data** | **str** | The hex-encoded call data to send to the contract. | 
**gas** | **str** | The estimated gas limit that should be used to send the transaction to guarantee settlement. | 
**gas_price** | **str** | The gas price, in Wei, that should be used to send the transaction. For EIP-1559 transactions, this value should be seen as the &#x60;maxFeePerGas&#x60; value. The transaction should be sent with this gas price to guarantee settlement. | 
**value** | **str** | The value of the transaction in Wei. | 

## Example

```python
from cdp.openapi_client.models.create_swap_quote_response_all_of_transaction import CreateSwapQuoteResponseAllOfTransaction

# TODO update the JSON string below
json = "{}"
# create an instance of CreateSwapQuoteResponseAllOfTransaction from a JSON string
create_swap_quote_response_all_of_transaction_instance = CreateSwapQuoteResponseAllOfTransaction.from_json(json)
# print the JSON string representation of the object
print(CreateSwapQuoteResponseAllOfTransaction.to_json())

# convert the object into a dict
create_swap_quote_response_all_of_transaction_dict = create_swap_quote_response_all_of_transaction_instance.to_dict()
# create an instance of CreateSwapQuoteResponseAllOfTransaction from a dict
create_swap_quote_response_all_of_transaction_from_dict = CreateSwapQuoteResponseAllOfTransaction.from_dict(create_swap_quote_response_all_of_transaction_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


