# EvmUserOperation

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**network** | [**models::EvmUserOperationNetwork**](EvmUserOperationNetwork.md) |  | 
**user_op_hash** | **String** | The hash of the user operation. This is not the transaction hash, as a transaction consists of multiple user operations. The user operation hash is the hash of this particular user operation which gets signed by the owner of the Smart Account. | 
**calls** | [**Vec<models::EvmCall>**](EvmCall.md) | The list of calls in the user operation. | 
**status** | **String** | The status of the user operation. | 
**transaction_hash** | Option<**String**> | The hash of the transaction that included this particular user operation. This gets set after the user operation is broadcasted and the transaction is included in a block. | [optional]
**receipts** | Option<[**Vec<models::UserOperationReceipt>**](UserOperationReceipt.md)> | The list of receipts associated with the user operation. | [optional]

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


