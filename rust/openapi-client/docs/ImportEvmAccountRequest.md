# ImportEvmAccountRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**encrypted_private_key** | **String** | The base64-encoded, encrypted private key of the EVM account. The private key must be encrypted using the CDP SDK's encryption scheme. | 
**name** | Option<**String**> | An optional name for the account. Account names can consist of alphanumeric characters and hyphens, and be between 2 and 36 characters long. Account names must be unique across all EVM accounts in the developer's CDP Project. | [optional]
**account_policy** | Option<**String**> | The ID of the account-level policy to apply to the account. | [optional]

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


