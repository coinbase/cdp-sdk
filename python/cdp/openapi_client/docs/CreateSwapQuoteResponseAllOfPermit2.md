# CreateSwapQuoteResponseAllOfPermit2

The approval object which contains the necessary fields to submit an approval for this transaction. Null if the `fromToken` is the native token or the transaction is a native token wrap / unwrap.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**hash** | **str** | The hash for the approval according to [EIP-712](https://eips.ethereum.org/EIPS/eip-712). Computing the hash of the &#x60;eip712&#x60; field should match the value of this field. | 
**eip712** | [**EIP712Message**](EIP712Message.md) |  | 

## Example

```python
from cdp.openapi_client.models.create_swap_quote_response_all_of_permit2 import CreateSwapQuoteResponseAllOfPermit2

# TODO update the JSON string below
json = "{}"
# create an instance of CreateSwapQuoteResponseAllOfPermit2 from a JSON string
create_swap_quote_response_all_of_permit2_instance = CreateSwapQuoteResponseAllOfPermit2.from_json(json)
# print the JSON string representation of the object
print(CreateSwapQuoteResponseAllOfPermit2.to_json())

# convert the object into a dict
create_swap_quote_response_all_of_permit2_dict = create_swap_quote_response_all_of_permit2_instance.to_dict()
# create an instance of CreateSwapQuoteResponseAllOfPermit2 from a dict
create_swap_quote_response_all_of_permit2_from_dict = CreateSwapQuoteResponseAllOfPermit2.from_dict(create_swap_quote_response_all_of_permit2_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


