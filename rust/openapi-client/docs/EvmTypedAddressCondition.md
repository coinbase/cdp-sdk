# EvmTypedAddressCondition

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**addresses** | **Vec<String>** | A list of 0x-prefixed EVM addresses that the value located at the message's path should be compared to. There is a limit of 300 addresses per criterion. | 
**operator** | **String** | The operator to use for the comparison. The value located at the message's path will be on the left-hand side of the operator, and the `addresses` field will be on the right-hand side. | 
**path** | **String** | The path to the field to compare against this criterion. To reference deeply nested fields within the message, separate object keys by `.`, and access array values using `[index]`. If the field does not exist or is not an address, the operation will be rejected. | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


