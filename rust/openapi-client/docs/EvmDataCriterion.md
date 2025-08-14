# EvmDataCriterion

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**r#type** | **String** | The type of criterion to use. This should be `evmData`. | 
**abi** | [**models::EvmDataCriterionAbi**](EvmDataCriterion_abi.md) |  | 
**conditions** | [**Vec<models::EvmDataCondition>**](EvmDataCondition.md) | A list of conditions to apply against the function and encoded arguments in the transaction's `data` field. Each condition must be met in order for this policy to be accepted or rejected. | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


