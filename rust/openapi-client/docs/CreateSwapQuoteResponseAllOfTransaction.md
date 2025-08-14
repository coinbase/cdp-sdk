# CreateSwapQuoteResponseAllOfTransaction

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**to** | **String** | The 0x-prefixed address of the contract to call. | 
**data** | **String** | The hex-encoded call data to send to the contract. | 
**gas** | **String** | The estimated gas limit that should be used to send the transaction to guarantee settlement. | 
**gas_price** | **String** | The gas price, in Wei, that should be used to send the transaction. For EIP-1559 transactions, this value should be seen as the `maxFeePerGas` value. The transaction should be sent with this gas price to guarantee settlement. | 
**value** | **String** | The value of the transaction in Wei. | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


