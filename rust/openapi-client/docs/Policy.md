# Policy

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **String** | The unique identifier for the policy. | 
**description** | Option<**String**> | An optional human-readable description of the policy. Policy descriptions can consist of alphanumeric characters, spaces, commas, and periods, and be 50 characters or less. | [optional]
**scope** | **String** | The scope of the policy. Only one project-level policy can exist at any time. | 
**rules** | [**Vec<models::Rule>**](Rule.md) | A list of rules that comprise the policy. | 
**created_at** | **String** | The ISO 8601 timestamp at which the Policy was created. | 
**updated_at** | **String** | The ISO 8601 timestamp at which the Policy was last updated. | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


