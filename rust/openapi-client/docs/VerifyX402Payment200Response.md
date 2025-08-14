# VerifyX402Payment200Response

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**is_valid** | **bool** | Indicates whether the payment is valid. | 
**invalid_reason** | Option<[**models::X402VerifyInvalidReason**](x402VerifyInvalidReason.md)> |  | [optional]
**payer** | **String** | The onchain address of the client that is paying for the resource.  For EVM networks, the payer will be a 0x-prefixed, checksum EVM address.  For Solana-based networks, the payer will be a base58-encoded Solana address. | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


