# CreateEvmSwapQuoteRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**network** | [**EvmSwapsNetwork**](EvmSwapsNetwork.md) |  | 
**to_token** | **str** | The 0x-prefixed contract address of the token to receive. | 
**from_token** | **str** | The 0x-prefixed contract address of the token to send. | 
**from_amount** | **str** | The amount of the &#x60;fromToken&#x60; to send in atomic units of the token. For example, &#x60;1000000000000000000&#x60; when sending ETH equates to 1 ETH, &#x60;1000000&#x60; when sending USDC equates to 1 USDC, etc. | 
**taker** | **str** | The 0x-prefixed address that holds the &#x60;fromToken&#x60; balance and has the &#x60;Permit2&#x60; allowance set for the swap. | 
**signer_address** | **str** | The 0x-prefixed Externally Owned Account (EOA) address that will sign the &#x60;Permit2&#x60; EIP-712 permit message. This is only needed if &#x60;taker&#x60; is a smart contract. | [optional] 
**gas_price** | **str** | The target gas price for the swap transaction, in Wei. For EIP-1559 transactions, this value should be seen as the &#x60;maxFeePerGas&#x60; value. If not provided, the API will use an estimate based on the current network conditions. | [optional] 
**slippage_bps** | **int** | The maximum acceptable slippage of the &#x60;toToken&#x60; in basis points. If this parameter is set to 0, no slippage will be tolerated. If not provided, the default slippage tolerance is 100 bps (i.e., 1%). | [optional] [default to 100]

## Example

```python
from cdp.openapi_client.models.create_evm_swap_quote_request import CreateEvmSwapQuoteRequest

# TODO update the JSON string below
json = "{}"
# create an instance of CreateEvmSwapQuoteRequest from a JSON string
create_evm_swap_quote_request_instance = CreateEvmSwapQuoteRequest.from_json(json)
# print the JSON string representation of the object
print(CreateEvmSwapQuoteRequest.to_json())

# convert the object into a dict
create_evm_swap_quote_request_dict = create_evm_swap_quote_request_instance.to_dict()
# create an instance of CreateEvmSwapQuoteRequest from a dict
create_evm_swap_quote_request_from_dict = CreateEvmSwapQuoteRequest.from_dict(create_evm_swap_quote_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


