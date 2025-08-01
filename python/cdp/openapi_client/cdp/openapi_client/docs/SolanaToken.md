# SolanaToken

General information about a Solana token. Includes the mint address, and other identifying information.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**symbol** | **str** | The symbol of this token (ex: SOL, USDC, RAY). The token symbol is not unique. It is possible for two different tokens to have the same symbol. For the native SOL token, this symbol is \&quot;SOL\&quot;. For SPL tokens, this symbol is defined in the token&#39;s metadata. Not all tokens have a symbol. This field will only be populated when the token has metadata available. | [optional] 
**name** | **str** | The name of this token (ex: \&quot;Solana\&quot;, \&quot;USD Coin\&quot;, \&quot;Raydium\&quot;). The token name is not unique. It is possible for two different tokens to have the same name. For the native SOL token, this name is \&quot;Solana\&quot;. For SPL tokens, this name is defined in the token&#39;s metadata. Not all tokens have a name. This field will only be populated when the token has metadata available. | [optional] 
**mint_address** | **str** | The mint address of the token. For native SOL, the mint address is &#x60;So11111111111111111111111111111111111111111&#x60;. For SPL tokens, this is the mint address where the token is defined. | 

## Example

```python
from cdp.openapi_client.models.solana_token import SolanaToken

# TODO update the JSON string below
json = "{}"
# create an instance of SolanaToken from a JSON string
solana_token_instance = SolanaToken.from_json(json)
# print the JSON string representation of the object
print(SolanaToken.to_json())

# convert the object into a dict
solana_token_dict = solana_token_instance.to_dict()
# create an instance of SolanaToken from a dict
solana_token_from_dict = SolanaToken.from_dict(solana_token_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


