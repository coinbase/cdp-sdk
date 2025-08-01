# CommonSwapResponse


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

## Example

```python
from cdp.openapi_client.models.common_swap_response import CommonSwapResponse

# TODO update the JSON string below
json = "{}"
# create an instance of CommonSwapResponse from a JSON string
common_swap_response_instance = CommonSwapResponse.from_json(json)
# print the JSON string representation of the object
print(CommonSwapResponse.to_json())

# convert the object into a dict
common_swap_response_dict = common_swap_response_instance.to_dict()
# create an instance of CommonSwapResponse from a dict
common_swap_response_from_dict = CommonSwapResponse.from_dict(common_swap_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


