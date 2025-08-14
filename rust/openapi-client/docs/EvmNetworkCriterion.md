# EvmNetworkCriterion

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**r#type** | **String** | The type of criterion to use. This should be `evmNetwork`. | 
**networks** | **Vec<String>** | A list of EVM network identifiers that the transaction's intended `network` should be compared to. | 
**operator** | **String** | The operator to use for the comparison. The transaction's intended `network` will be on the left-hand side of the operator, and the `networks` field will be on the right-hand side. | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


