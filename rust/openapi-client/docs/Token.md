# Token

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**network** | [**models::ListEvmTokenBalancesNetwork**](ListEvmTokenBalancesNetwork.md) |  | 
**symbol** | Option<**String**> | The symbol of this token (ex: SOL, ETH, USDC). The token symbol is not unique. It is possible for two different tokens to have the same symbol. For native gas tokens, this symbol is defined via convention. As an example, for ETH on Ethereum mainnet, the symbol is \"ETH\". For ERC-20 tokens, this symbol is defined via configuration. `symbol` will be the string returned by `function symbol() public view returns (string)` on the underlying token contract. Not all tokens have a symbol, as this function is [optional in the ERC-20 specification](https://eips.ethereum.org/EIPS/eip-20#symbol). This field will only be populated when the token's underlying ERC-20 contract has a `symbol()` function. Further, this endpoint will only populate this value for a small subset of whitelisted ERC-20 tokens at this time. We intend to improve coverage in the future. | [optional]
**name** | Option<**String**> | The name of this token (ex: \"Solana\", \"Ether\", \"USD Coin\"). The token name is not unique. It is possible for two different tokens to have the same name. For native gas tokens, this name is defined via convention. As an example, for ETH on Ethereum mainnet, the name is \"Ether\". For ERC-20 tokens, this name is defined via configuration. `name` will be the string returned by `function name() public view returns (string)` on the underlying token contract. Not all tokens have a name, as this function is [optional in the ERC-20 specification](https://eips.ethereum.org/EIPS/eip-20#name). This field will only be populated when the token's underlying ERC-20 contract has a `name()` function. Further, this endpoint will only populate this value for a small subset of whitelisted ERC-20 tokens at this time. We intend to improve coverage in the future. | [optional]
**contract_address** | **String** | The contract address of the token. For Ether, the contract address is `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE` per [EIP-7528](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-7528.md). For ERC-20 tokens, this is the contract address where the token is deployed. | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


