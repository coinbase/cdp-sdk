# ListEvmTokenBalances200Response


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**next_page_token** | **str** | The token for the next page of items, if any. | [optional] 
**balances** | [**List[TokenBalance]**](TokenBalance.md) | The list of EVM token balances. | 

## Example

```python
from cdp.openapi_client.models.list_evm_token_balances200_response import ListEvmTokenBalances200Response

# TODO update the JSON string below
json = "{}"
# create an instance of ListEvmTokenBalances200Response from a JSON string
list_evm_token_balances200_response_instance = ListEvmTokenBalances200Response.from_json(json)
# print the JSON string representation of the object
print(ListEvmTokenBalances200Response.to_json())

# convert the object into a dict
list_evm_token_balances200_response_dict = list_evm_token_balances200_response_instance.to_dict()
# create an instance of ListEvmTokenBalances200Response from a dict
list_evm_token_balances200_response_from_dict = ListEvmTokenBalances200Response.from_dict(list_evm_token_balances200_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


