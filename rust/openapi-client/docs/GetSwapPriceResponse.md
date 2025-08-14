# GetSwapPriceResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**block_number** | **String** | The block number at which the liquidity conditions were examined. | 
**to_amount** | **String** | The amount of the `toToken` that will be received in atomic units of the `toToken`. For example, `1000000000000000000` when receiving ETH equates to 1 ETH, `1000000` when receiving USDC equates to 1 USDC, etc. | 
**to_token** | **String** | The 0x-prefixed contract address of the token that will be received. | 
**fees** | [**models::CommonSwapResponseFees**](CommonSwapResponse_fees.md) |  | 
**issues** | [**models::CommonSwapResponseIssues**](CommonSwapResponse_issues.md) |  | 
**liquidity_available** | **bool** | Whether sufficient liquidity is available to settle the swap. All other fields in the response will be empty if this is false. | 
**min_to_amount** | **String** | The minimum amount of the `toToken` that must be received for the swap to succeed, in atomic units of the `toToken`.  For example, `1000000000000000000` when receiving ETH equates to 1 ETH, `1000000` when receiving USDC equates to 1 USDC, etc. This value is influenced by the `slippageBps` parameter. | 
**from_amount** | **String** | The amount of the `fromToken` that will be sent in this swap, in atomic units of the `fromToken`. For example, `1000000000000000000` when sending ETH equates to 1 ETH, `1000000` when sending USDC equates to 1 USDC, etc. | 
**from_token** | **String** | The 0x-prefixed contract address of the token that will be sent. | 
**gas** | Option<**String**> | The estimated gas limit that should be used to send the transaction to guarantee settlement. | 
**gas_price** | **String** | The gas price, in Wei, that should be used to send the transaction. For EIP-1559 transactions, this value should be seen as the `maxFeePerGas` value. The transaction should be sent with this gas price to guarantee settlement. | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


