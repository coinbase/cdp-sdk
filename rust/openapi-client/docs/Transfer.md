# Transfer

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **String** | The ID of the transfer. | 
**source_type** | **String** | The type of the source of the transfer. | 
**source** | [**models::TransferSource**](Transfer_source.md) |  | 
**target_type** | **String** | The type of the target of the transfer. | 
**target** | [**models::TransferTarget**](Transfer_target.md) |  | 
**source_amount** | **String** | The amount the source will transfer. | 
**source_currency** | **String** | The currency the source will transfer. | 
**target_amount** | **String** | The amount the target will receive. | 
**target_currency** | **String** | The currency the target will receive. | 
**user_amount** | **String** | The amount the customer put in to transfer. | 
**user_currency** | **String** | The currency the customer put in to transfer. | 
**fees** | [**Vec<models::Fee>**](Fee.md) | The fees for the transfer. | 
**status** | **String** | The status of the transfer. | 
**created_at** | **String** | The UTC date and time in ISO 8601 format the transfer was created. | 
**updated_at** | **String** | The UTC date and time in ISO 8601 format the transfer was updated. | 
**transaction_hash** | Option<**String**> | The transaction hash or transaction signature of the transfer. | [optional]

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


