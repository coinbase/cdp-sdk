# SolanaTokenBalance


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**amount** | [**SolanaTokenAmount**](SolanaTokenAmount.md) |  | 
**token** | [**SolanaToken**](SolanaToken.md) |  | 

## Example

```python
from cdp.openapi_client.models.solana_token_balance import SolanaTokenBalance

# TODO update the JSON string below
json = "{}"
# create an instance of SolanaTokenBalance from a JSON string
solana_token_balance_instance = SolanaTokenBalance.from_json(json)
# print the JSON string representation of the object
print(SolanaTokenBalance.to_json())

# convert the object into a dict
solana_token_balance_dict = solana_token_balance_instance.to_dict()
# create an instance of SolanaTokenBalance from a dict
solana_token_balance_from_dict = SolanaTokenBalance.from_dict(solana_token_balance_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


