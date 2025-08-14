# CreatePaymentTransferQuoteRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**source_type** | **String** | The type of the source of the transfer. | 
**source** | [**models::TransferSource**](TransferSource.md) |  | 
**target_type** | **String** | The type of the target of the transfer. | 
**target** | [**models::TransferTarget**](TransferTarget.md) |  | 
**amount** | **String** | The amount of the transfer, which is either for the source currency to buy, or the target currency to receive. | 
**currency** | **String** | The currency of the transfer. This can be specified as the source currency, which would be used to buy, or else the target currency, which is how much will be received. | 
**execute** | Option<**bool**> | Whether to execute the transfer. If true, the transfer will be committed and executed. If false, the quote will be generated and returned. | [optional][default to false]

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


