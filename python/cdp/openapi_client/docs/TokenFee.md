# TokenFee


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**amount** | **str** | The estimated amount of the fee in atomic units of the &#x60;token&#x60;. For example, &#x60;1000000000000000&#x60; if the fee is in ETH equates to 0.001 ETH, &#x60;10000&#x60; if the fee is in USDC equates to 0.01 USDC, etc. | 
**token** | **str** | The contract address of the token that the fee is paid in. The address &#x60;0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE&#x60; is used for the native token of the network (e.g. ETH). | 

## Example

```python
from cdp.openapi_client.models.token_fee import TokenFee

# TODO update the JSON string below
json = "{}"
# create an instance of TokenFee from a JSON string
token_fee_instance = TokenFee.from_json(json)
# print the JSON string representation of the object
print(TokenFee.to_json())

# convert the object into a dict
token_fee_dict = token_fee_instance.to_dict()
# create an instance of TokenFee from a dict
token_fee_from_dict = TokenFee.from_dict(token_fee_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


