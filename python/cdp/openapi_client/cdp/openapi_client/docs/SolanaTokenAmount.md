# SolanaTokenAmount

Amount of a given Solana token.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**amount** | **str** | The amount is denominated in the smallest indivisible unit of the token. For SOL, the smallest indivisible unit is lamports (10^-9 SOL). For SPL tokens, the smallest unit is defined by the token&#39;s decimals configuration. | 
**decimals** | **int** | &#39;decimals&#39; is the exponential value N that satisfies the equation &#x60;amount * 10^-N &#x3D; standard_denomination&#x60;. The standard denomination is the most commonly used denomination for the token. - For native SOL, &#x60;decimals&#x60; is 9 (1 SOL &#x3D; 10^9 lamports). - For SPL tokens, &#x60;decimals&#x60; is defined in the token&#39;s mint configuration. | 

## Example

```python
from cdp.openapi_client.models.solana_token_amount import SolanaTokenAmount

# TODO update the JSON string below
json = "{}"
# create an instance of SolanaTokenAmount from a JSON string
solana_token_amount_instance = SolanaTokenAmount.from_json(json)
# print the JSON string representation of the object
print(SolanaTokenAmount.to_json())

# convert the object into a dict
solana_token_amount_dict = solana_token_amount_instance.to_dict()
# create an instance of SolanaTokenAmount from a dict
solana_token_amount_from_dict = SolanaTokenAmount.from_dict(solana_token_amount_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


