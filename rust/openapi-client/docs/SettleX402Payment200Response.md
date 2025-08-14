# SettleX402Payment200Response

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**success** | **bool** | Indicates whether the payment settlement is successful. | 
**error_reason** | Option<[**models::X402SettleErrorReason**](x402SettleErrorReason.md)> |  | [optional]
**payer** | **String** | The onchain address of the client that is paying for the resource.  For EVM networks, the payer will be a 0x-prefixed, checksum EVM address.  For Solana-based networks, the payer will be a base58-encoded Solana address. | 
**transaction** | **String** | The transaction of the settlement. For EVM networks, the transaction will be a 0x-prefixed, EVM transaction hash. For Solana-based networks, the transaction will be a base58-encoded Solana signature. | 
**network** | **String** | The network where the settlement occurred. | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


