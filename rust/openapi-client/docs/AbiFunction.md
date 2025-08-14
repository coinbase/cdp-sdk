# AbiFunction

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**r#type** | **String** | The type of the ABI item, must be `function`. | 
**name** | **String** | The name of the ABI function. | 
**inputs** | [**Vec<models::AbiParameter>**](AbiParameter.md) | The list of ABI parameters used for this function. | 
**outputs** | [**Vec<models::AbiParameter>**](AbiParameter.md) | The values returned by this function. | 
**constant** | Option<**bool**> | Deprecated. Use pure or view from stateMutability instead. | [optional]
**payable** | Option<**bool**> | Deprecated. Use payable or nonpayable from `stateMutability` instead. | [optional]
**state_mutability** | [**models::AbiStateMutability**](AbiStateMutability.md) |  | 
**gas** | Option<**i32**> | Deprecated. Vyper used to provide gas estimates. | [optional]

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


