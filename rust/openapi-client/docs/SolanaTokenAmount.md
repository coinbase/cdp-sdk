# SolanaTokenAmount

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**amount** | **String** | The amount is denominated in the smallest indivisible unit of the token. For SOL, the smallest indivisible unit is lamports (10^-9 SOL). For SPL tokens, the smallest unit is defined by the token's decimals configuration. | 
**decimals** | **i64** | 'decimals' is the exponential value N that satisfies the equation `amount * 10^-N = standard_denomination`. The standard denomination is the most commonly used denomination for the token. - For native SOL, `decimals` is 9 (1 SOL = 10^9 lamports). - For SPL tokens, `decimals` is defined in the token's mint configuration. | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


