# SplAddressCriterion

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**r#type** | **String** | The type of criterion to use. This should be `splAddress`. | 
**addresses** | **Vec<String>** | The Solana addresses that are compared to the list of SPL token transfer recipient addresses in the transaction's `accountKeys` (for legacy transactions) or `staticAccountKeys` (for V0 transactions) array. | 
**operator** | **String** | The operator to use for the comparison. Each of the SPL token transfer recipient addresses in the transaction's `accountKeys` (for legacy transactions) or `staticAccountKeys` (for V0 transactions) array will be on the left-hand side of the operator, and the `addresses` field will be on the right-hand side. | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


