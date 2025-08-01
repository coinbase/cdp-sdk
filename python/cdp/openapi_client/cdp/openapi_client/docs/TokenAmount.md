# TokenAmount

Amount of a given token.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**amount** | **str** | The amount is denominated in the smallest indivisible unit of the token. For ETH, the smallest indivisible unit is Wei (10^-18 ETH). For ERC-20s, the smallest unit is the unit returned from &#x60;function totalSupply() public view returns (uint256)&#x60;. | 
**decimals** | **int** | &#39;decimals&#39; is the exponential value N that satisfies the equation &#x60;amount * 10^-N &#x3D; standard_denomination&#x60;. The standard denomination is the most commonly used denomination for the token. - In the case of the native gas token, &#x60;decimals&#x60; is defined via convention. As an example, for ETH of Ethereum mainnet, the standard denomination is 10^-18 the smallest denomination (Wei). As such, for ETH on Ethereum mainnet, &#x60;decimals&#x60; is 18. - In the case of ERC-20 tokens, &#x60;decimals&#x60; is defined via configuration. &#x60;decimals&#x60; will be the number returned by &#x60;function decimals() public view returns (uint8)&#x60; on the underlying token contract. Not all tokens have a &#x60;decimals&#x60; field, as this function is [optional in the ERC-20 specification](https://eips.ethereum.org/EIPS/eip-20#decimals). This field will be left empty if the underlying token contract doesn&#39;t implement &#x60;decimals&#x60;. Further, this endpoint will only populate this value for a small subset of whitelisted ERC-20 tokens at this time. We intend to improve coverage in the future. | 

## Example

```python
from cdp.openapi_client.models.token_amount import TokenAmount

# TODO update the JSON string below
json = "{}"
# create an instance of TokenAmount from a JSON string
token_amount_instance = TokenAmount.from_json(json)
# print the JSON string representation of the object
print(TokenAmount.to_json())

# convert the object into a dict
token_amount_dict = token_amount_instance.to_dict()
# create an instance of TokenAmount from a dict
token_amount_from_dict = TokenAmount.from_dict(token_amount_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


