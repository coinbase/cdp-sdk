# SolanaToken

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**symbol** | Option<**String**> | The symbol of this token (ex: SOL, USDC, RAY). The token symbol is not unique. It is possible for two different tokens to have the same symbol. For the native SOL token, this symbol is \"SOL\". For SPL tokens, this symbol is defined in the token's metadata. Not all tokens have a symbol. This field will only be populated when the token has metadata available. | [optional]
**name** | Option<**String**> | The name of this token (ex: \"Solana\", \"USD Coin\", \"Raydium\"). The token name is not unique. It is possible for two different tokens to have the same name. For the native SOL token, this name is \"Solana\". For SPL tokens, this name is defined in the token's metadata. Not all tokens have a name. This field will only be populated when the token has metadata available. | [optional]
**mint_address** | **String** | The mint address of the token. For native SOL, the mint address is `So11111111111111111111111111111111111111111`. For SPL tokens, this is the mint address where the token is defined. | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


