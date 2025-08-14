# CreateSpendPermissionRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**network** | [**models::SpendPermissionNetwork**](SpendPermissionNetwork.md) |  | 
**spender** | **String** | Entity that can spend account's tokens. Can be either a Smart Account or an EOA. | 
**token** | **String** | ERC-7528 native token address (e.g. \"0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE\" for native ETH), or an  ERC-20 contract address. | 
**allowance** | **String** | Maximum allowed value to spend, in atomic units for the specified token, within each period. | 
**period** | **String** | Time duration for resetting used allowance on a recurring basis (seconds). | 
**start** | **String** | The start time for this spend permission, in Unix seconds. | 
**end** | **String** | The expiration time for this spend permission, in Unix seconds. | 
**salt** | Option<**String**> | An arbitrary salt to differentiate unique spend permissions with otherwise identical data. | [optional]
**extra_data** | Option<**String**> | Arbitrary data to include in the permission. | [optional]
**paymaster_url** | Option<**String**> | The paymaster URL of the spend permission. | [optional]

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


