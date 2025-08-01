# GetSwapPriceResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**block_number** | **str** | The block number at which the liquidity conditions were examined. | 
**to_amount** | **str** | The amount of the &#x60;toToken&#x60; that will be received in atomic units of the &#x60;toToken&#x60;. For example, &#x60;1000000000000000000&#x60; when receiving ETH equates to 1 ETH, &#x60;1000000&#x60; when receiving USDC equates to 1 USDC, etc. | 
**to_token** | **str** | The 0x-prefixed contract address of the token that will be received. | 
**fees** | [**CommonSwapResponseFees**](CommonSwapResponseFees.md) |  | 
**issues** | [**CommonSwapResponseIssues**](CommonSwapResponseIssues.md) |  | 
**liquidity_available** | **bool** | Whether sufficient liquidity is available to settle the swap. All other fields in the response will be empty if this is false. | 
**min_to_amount** | **str** | The minimum amount of the &#x60;toToken&#x60; that must be received for the swap to succeed, in atomic units of the &#x60;toToken&#x60;.  For example, &#x60;1000000000000000000&#x60; when receiving ETH equates to 1 ETH, &#x60;1000000&#x60; when receiving USDC equates to 1 USDC, etc. This value is influenced by the &#x60;slippageBps&#x60; parameter. | 
**from_amount** | **str** | The amount of the &#x60;fromToken&#x60; that will be sent in this swap, in atomic units of the &#x60;fromToken&#x60;. For example, &#x60;1000000000000000000&#x60; when sending ETH equates to 1 ETH, &#x60;1000000&#x60; when sending USDC equates to 1 USDC, etc. | 
**from_token** | **str** | The 0x-prefixed contract address of the token that will be sent. | 
**gas** | **str** | The estimated gas limit that should be used to send the transaction to guarantee settlement. | 
**gas_price** | **str** | The gas price, in Wei, that should be used to send the transaction. For EIP-1559 transactions, this value should be seen as the &#x60;maxFeePerGas&#x60; value. The transaction should be sent with this gas price to guarantee settlement. | 

## Example

```python
from cdp.openapi_client.models.get_swap_price_response import GetSwapPriceResponse

# TODO update the JSON string below
json = "{}"
# create an instance of GetSwapPriceResponse from a JSON string
get_swap_price_response_instance = GetSwapPriceResponse.from_json(json)
# print the JSON string representation of the object
print(GetSwapPriceResponse.to_json())

# convert the object into a dict
get_swap_price_response_dict = get_swap_price_response_instance.to_dict()
# create an instance of GetSwapPriceResponse from a dict
get_swap_price_response_from_dict = GetSwapPriceResponse.from_dict(get_swap_price_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


