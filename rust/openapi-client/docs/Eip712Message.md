# Eip712Message

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**domain** | [**models::Eip712Domain**](EIP712Domain.md) |  | 
**types** | [**serde_json::Value**](.md) | A mapping of struct names to an array of type objects (name + type). Each key corresponds to a type name (e.g., \"`EIP712Domain`\", \"`PermitTransferFrom`\").  | 
**primary_type** | **String** | The primary type of the message. This is the name of the struct in the `types` object that is the root of the message. | 
**message** | [**serde_json::Value**](.md) | The message to sign. The structure of this message must match the `primaryType` struct in the `types` object. | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


