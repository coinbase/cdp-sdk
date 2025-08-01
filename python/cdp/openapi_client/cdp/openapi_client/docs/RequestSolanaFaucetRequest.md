# RequestSolanaFaucetRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**address** | **str** | The address to request funds to, which is a base58-encoded string. | 
**token** | **str** | The token to request funds for. | 

## Example

```python
from cdp.openapi_client.models.request_solana_faucet_request import RequestSolanaFaucetRequest

# TODO update the JSON string below
json = "{}"
# create an instance of RequestSolanaFaucetRequest from a JSON string
request_solana_faucet_request_instance = RequestSolanaFaucetRequest.from_json(json)
# print the JSON string representation of the object
print(RequestSolanaFaucetRequest.to_json())

# convert the object into a dict
request_solana_faucet_request_dict = request_solana_faucet_request_instance.to_dict()
# create an instance of RequestSolanaFaucetRequest from a dict
request_solana_faucet_request_from_dict = RequestSolanaFaucetRequest.from_dict(request_solana_faucet_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


