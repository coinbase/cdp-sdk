# RequestEvmFaucetRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**network** | **str** | The network to request funds from. | 
**address** | **str** | The address to request funds to, which is a 0x-prefixed hexadecimal string. | 
**token** | **str** | The token to request funds for. | 

## Example

```python
from cdp.openapi_client.models.request_evm_faucet_request import RequestEvmFaucetRequest

# TODO update the JSON string below
json = "{}"
# create an instance of RequestEvmFaucetRequest from a JSON string
request_evm_faucet_request_instance = RequestEvmFaucetRequest.from_json(json)
# print the JSON string representation of the object
print(RequestEvmFaucetRequest.to_json())

# convert the object into a dict
request_evm_faucet_request_dict = request_evm_faucet_request_instance.to_dict()
# create an instance of RequestEvmFaucetRequest from a dict
request_evm_faucet_request_from_dict = RequestEvmFaucetRequest.from_dict(request_evm_faucet_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


