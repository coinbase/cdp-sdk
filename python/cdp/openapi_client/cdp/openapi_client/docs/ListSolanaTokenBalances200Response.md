# ListSolanaTokenBalances200Response


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**next_page_token** | **str** | The token for the next page of items, if any. | [optional] 
**balances** | [**List[SolanaTokenBalance]**](SolanaTokenBalance.md) | The list of Solana token balances. | 

## Example

```python
from cdp.openapi_client.models.list_solana_token_balances200_response import ListSolanaTokenBalances200Response

# TODO update the JSON string below
json = "{}"
# create an instance of ListSolanaTokenBalances200Response from a JSON string
list_solana_token_balances200_response_instance = ListSolanaTokenBalances200Response.from_json(json)
# print the JSON string representation of the object
print(ListSolanaTokenBalances200Response.to_json())

# convert the object into a dict
list_solana_token_balances200_response_dict = list_solana_token_balances200_response_instance.to_dict()
# create an instance of ListSolanaTokenBalances200Response from a dict
list_solana_token_balances200_response_from_dict = ListSolanaTokenBalances200Response.from_dict(list_solana_token_balances200_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


