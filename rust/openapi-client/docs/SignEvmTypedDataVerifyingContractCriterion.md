# SignEvmTypedDataVerifyingContractCriterion

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**r#type** | **String** | The type of criterion to use. This should be `evmTypedDataVerifyingContract`. | 
**addresses** | **Vec<String>** | A list of 0x-prefixed EVM addresses that the domain's verifying contract should be compared to. There is a limit of 300 addresses per criterion. | 
**operator** | **String** | The operator to use for the comparison. The domain's verifying contract will be on the left-hand side of the operator, and the `addresses` field will be on the right-hand side. | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


