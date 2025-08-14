# NetUsdChangeCriterion

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**r#type** | **String** | The type of criterion to use. This should be `netUSDChange`. | 
**change_cents** | **i32** | The amount of USD, in cents, that the total value of a transaction's asset transfer should be compared to. | 
**operator** | **String** | The operator to use for the comparison. The total value of a transaction's asset transfer will be on the left-hand side of the operator, and the `changeCents` field will be on the right-hand side. | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


