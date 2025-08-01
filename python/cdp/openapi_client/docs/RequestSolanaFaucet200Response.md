# RequestSolanaFaucet200Response


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**transaction_signature** | **str** | The signature identifying the transaction that requested the funds. | 

## Example

```python
from cdp.openapi_client.models.request_solana_faucet200_response import RequestSolanaFaucet200Response

# TODO update the JSON string below
json = "{}"
# create an instance of RequestSolanaFaucet200Response from a JSON string
request_solana_faucet200_response_instance = RequestSolanaFaucet200Response.from_json(json)
# print the JSON string representation of the object
print(RequestSolanaFaucet200Response.to_json())

# convert the object into a dict
request_solana_faucet200_response_dict = request_solana_faucet200_response_instance.to_dict()
# create an instance of RequestSolanaFaucet200Response from a dict
request_solana_faucet200_response_from_dict = RequestSolanaFaucet200Response.from_dict(request_solana_faucet200_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


