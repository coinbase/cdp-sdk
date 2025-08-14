# EvmAccount

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**address** | **String** | The 0x-prefixed, checksum EVM address. | 
**name** | Option<**String**> | An optional name for the account. Account names can consist of alphanumeric characters and hyphens, and be between 2 and 36 characters long. Account names are guaranteed to be unique across all EVM accounts in the developer's CDP Project. | [optional]
**policies** | Option<**Vec<String>**> | The list of policy IDs that apply to the account. This will include both the project-level policy and the account-level policy, if one exists. | [optional]
**created_at** | Option<**String**> | The UTC ISO 8601 timestamp at which the account was created. | [optional]
**updated_at** | Option<**String**> | The UTC ISO 8601 timestamp at which the account was last updated. | [optional]

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


