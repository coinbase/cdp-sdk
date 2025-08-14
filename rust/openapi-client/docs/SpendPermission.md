# SpendPermission

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**account** | **String** | Smart account this spend permission is valid for. | 
**spender** | **String** | Entity that can spend account's tokens. | 
**token** | **String** | Token address (ERC-7528 native token address or ERC-20 contract). | 
**allowance** | **String** | Maximum allowed value to spend, in atomic units for the specified token, within each period. | 
**period** | **String** | Time duration for resetting used allowance on a recurring basis (seconds). | 
**start** | **String** | The start time for this spend permission, in Unix seconds. | 
**end** | **String** | The expiration time for this spend permission, in Unix seconds. | 
**salt** | **String** | An arbitrary salt to differentiate unique spend permissions with otherwise identical data. | 
**extra_data** | **String** | Arbitrary data to include in the permission. | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


