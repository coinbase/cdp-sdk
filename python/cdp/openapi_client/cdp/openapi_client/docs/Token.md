# Token

General information about a token. Includes the type, the network, and other identifying information.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**network** | [**ListEvmTokenBalancesNetwork**](ListEvmTokenBalancesNetwork.md) |  | 
**symbol** | **str** | The symbol of this token (ex: SOL, ETH, USDC). The token symbol is not unique. It is possible for two different tokens to have the same symbol. For native gas tokens, this symbol is defined via convention. As an example, for ETH on Ethereum mainnet, the symbol is \&quot;ETH\&quot;. For ERC-20 tokens, this symbol is defined via configuration. &#x60;symbol&#x60; will be the string returned by &#x60;function symbol() public view returns (string)&#x60; on the underlying token contract. Not all tokens have a symbol, as this function is [optional in the ERC-20 specification](https://eips.ethereum.org/EIPS/eip-20#symbol). This field will only be populated when the token&#39;s underlying ERC-20 contract has a &#x60;symbol()&#x60; function. Further, this endpoint will only populate this value for a small subset of whitelisted ERC-20 tokens at this time. We intend to improve coverage in the future. | [optional] 
**name** | **str** | The name of this token (ex: \&quot;Solana\&quot;, \&quot;Ether\&quot;, \&quot;USD Coin\&quot;). The token name is not unique. It is possible for two different tokens to have the same name. For native gas tokens, this name is defined via convention. As an example, for ETH on Ethereum mainnet, the name is \&quot;Ether\&quot;. For ERC-20 tokens, this name is defined via configuration. &#x60;name&#x60; will be the string returned by &#x60;function name() public view returns (string)&#x60; on the underlying token contract. Not all tokens have a name, as this function is [optional in the ERC-20 specification](https://eips.ethereum.org/EIPS/eip-20#name). This field will only be populated when the token&#39;s underlying ERC-20 contract has a &#x60;name()&#x60; function. Further, this endpoint will only populate this value for a small subset of whitelisted ERC-20 tokens at this time. We intend to improve coverage in the future. | [optional] 
**contract_address** | **str** | The contract address of the token. For Ether, the contract address is &#x60;0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE&#x60; per [EIP-7528](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-7528.md). For ERC-20 tokens, this is the contract address where the token is deployed. | 

## Example

```python
from cdp.openapi_client.models.token import Token

# TODO update the JSON string below
json = "{}"
# create an instance of Token from a JSON string
token_instance = Token.from_json(json)
# print the JSON string representation of the object
print(Token.to_json())

# convert the object into a dict
token_dict = token_instance.to_dict()
# create an instance of Token from a dict
token_from_dict = Token.from_dict(token_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


