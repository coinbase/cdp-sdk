# EndUser

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**user_id** | **String** | A stable, unique identifier for the end user. The `userId` must be unique across all end users in the developer's CDP Project. It must be between 1 and 100 characters long and can only contain alphanumeric characters and hyphens. | 
**authentication_methods** | [**Vec<models::AuthenticationMethod>**](AuthenticationMethod.md) | The list of valid authentication methods linked to the end user. | 
**evm_accounts** | **Vec<String>** | The list of EVM accounts associated with the end user. Currently, only one EVM account is supported per end user. | 
**evm_smart_accounts** | **Vec<String>** | The list of EVM smart accounts associated with the end user. Currently, only one EVM smart account is supported per end user. | 
**solana_accounts** | **Vec<String>** | The list of Solana accounts associated with the end user. Currently, only one Solana account is supported per end user. | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


