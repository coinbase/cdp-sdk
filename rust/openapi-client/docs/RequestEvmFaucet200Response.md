# RequestEvmFaucet200Response

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**transaction_hash** | **String** | The hash of the transaction that requested the funds. **Note:** In rare cases, when gas conditions are unusually high, the transaction may not confirm, and the system may issue a replacement transaction to complete the faucet request. In these rare cases, the `transactionHash` will be out of sync with the actual faucet transaction that was confirmed onchain. | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


