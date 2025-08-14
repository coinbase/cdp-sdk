# EvmDataParameterCondition

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **String** | The name of the parameter to check against a transaction's calldata. If name is unknown, or is not named, you may supply an array index, e.g., `0` for first parameter. | 
**operator** | **String** | The operator to use for the comparison. The value resolved at the `name` will be on the left-hand side of the operator, and the `value` field will be on the right-hand side. | 
**value** | **String** | A single value to compare the value resolved at `name` to. All values are encoded as strings. Refer to the table in the documentation for how values should be encoded, and which operators are supported for each type. | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


