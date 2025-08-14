# X402PaymentRequirements

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**scheme** | **String** | The scheme of the payment protocol to use. Currently, the only supported scheme is `exact`. | 
**network** | **String** | The network of the blockchain to send payment on. | 
**max_amount_required** | **String** | The maximum amount required to pay for the resource in atomic units of the payment asset. | 
**resource** | **String** | The URL of the resource to pay for. | 
**description** | **String** | The description of the resource. | 
**mime_type** | **String** | The MIME type of the resource response. | 
**output_schema** | Option<[**std::collections::HashMap<String, serde_json::Value>**](serde_json::Value.md)> | The optional JSON schema describing the resource output. | [optional]
**pay_to** | **String** | The destination to pay value to.  For EVM networks, payTo will be a 0x-prefixed, checksum EVM address.  For Solana-based networks, payTo will be a base58-encoded Solana address. | 
**max_timeout_seconds** | **i32** | The maximum time in seconds for the resource server to respond. | 
**asset** | **String** | The asset to pay with.  For EVM networks, the asset will be a 0x-prefixed, checksum EVM address.  For Solana-based networks, the asset will be a base58-encoded Solana address. | 
**extra** | Option<[**std::collections::HashMap<String, serde_json::Value>**](serde_json::Value.md)> | The optional additional scheme-specific payment info. | [optional]

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


