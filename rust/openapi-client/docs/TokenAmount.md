# TokenAmount

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**amount** | **String** | The amount is denominated in the smallest indivisible unit of the token. For ETH, the smallest indivisible unit is Wei (10^-18 ETH). For ERC-20s, the smallest unit is the unit returned from `function totalSupply() public view returns (uint256)`. | 
**decimals** | **i64** | 'decimals' is the exponential value N that satisfies the equation `amount * 10^-N = standard_denomination`. The standard denomination is the most commonly used denomination for the token. - In the case of the native gas token, `decimals` is defined via convention. As an example, for ETH of Ethereum mainnet, the standard denomination is 10^-18 the smallest denomination (Wei). As such, for ETH on Ethereum mainnet, `decimals` is 18. - In the case of ERC-20 tokens, `decimals` is defined via configuration. `decimals` will be the number returned by `function decimals() public view returns (uint8)` on the underlying token contract. Not all tokens have a `decimals` field, as this function is [optional in the ERC-20 specification](https://eips.ethereum.org/EIPS/eip-20#decimals). This field will be left empty if the underlying token contract doesn't implement `decimals`. Further, this endpoint will only populate this value for a small subset of whitelisted ERC-20 tokens at this time. We intend to improve coverage in the future. | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


