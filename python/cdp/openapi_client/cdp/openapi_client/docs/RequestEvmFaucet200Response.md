# RequestEvmFaucet200Response


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**transaction_hash** | **str** | The hash of the transaction that requested the funds. **Note:** In rare cases, when gas conditions are unusually high, the transaction may not confirm, and the system may issue a replacement transaction to complete the faucet request. In these rare cases, the &#x60;transactionHash&#x60; will be out of sync with the actual faucet transaction that was confirmed onchain. | 

## Example

```python
from cdp.openapi_client.models.request_evm_faucet200_response import RequestEvmFaucet200Response

# TODO update the JSON string below
json = "{}"
# create an instance of RequestEvmFaucet200Response from a JSON string
request_evm_faucet200_response_instance = RequestEvmFaucet200Response.from_json(json)
# print the JSON string representation of the object
print(RequestEvmFaucet200Response.to_json())

# convert the object into a dict
request_evm_faucet200_response_dict = request_evm_faucet200_response_instance.to_dict()
# create an instance of RequestEvmFaucet200Response from a dict
request_evm_faucet200_response_from_dict = RequestEvmFaucet200Response.from_dict(request_evm_faucet200_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


