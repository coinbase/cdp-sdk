# CreateEvmSwapQuoteRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**network** | [**models::EvmSwapsNetwork**](EvmSwapsNetwork.md) |  | 
**to_token** | **String** | The 0x-prefixed contract address of the token to receive. | 
**from_token** | **String** | The 0x-prefixed contract address of the token to send. | 
**from_amount** | **String** | The amount of the `fromToken` to send in atomic units of the token. For example, `1000000000000000000` when sending ETH equates to 1 ETH, `1000000` when sending USDC equates to 1 USDC, etc. | 
**taker** | **String** | The 0x-prefixed address that holds the `fromToken` balance and has the `Permit2` allowance set for the swap. | 
**signer_address** | Option<**String**> | The 0x-prefixed Externally Owned Account (EOA) address that will sign the `Permit2` EIP-712 permit message. This is only needed if `taker` is a smart contract. | [optional]
**gas_price** | Option<**String**> | The target gas price for the swap transaction, in Wei. For EIP-1559 transactions, this value should be seen as the `maxFeePerGas` value. If not provided, the API will use an estimate based on the current network conditions. | [optional]
**slippage_bps** | Option<**i32**> | The maximum acceptable slippage of the `toToken` in basis points. If this parameter is set to 0, no slippage will be tolerated. If not provided, the default slippage tolerance is 100 bps (i.e., 1%). | [optional][default to 100]

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


