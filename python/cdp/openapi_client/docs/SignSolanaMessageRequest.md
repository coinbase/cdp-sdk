# SignSolanaMessageRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**message** | **str** | The arbitrary message to sign. | 

## Example

```python
from cdp.openapi_client.models.sign_solana_message_request import SignSolanaMessageRequest

# TODO update the JSON string below
json = "{}"
# create an instance of SignSolanaMessageRequest from a JSON string
sign_solana_message_request_instance = SignSolanaMessageRequest.from_json(json)
# print the JSON string representation of the object
print(SignSolanaMessageRequest.to_json())

# convert the object into a dict
sign_solana_message_request_dict = sign_solana_message_request_instance.to_dict()
# create an instance of SignSolanaMessageRequest from a dict
sign_solana_message_request_from_dict = SignSolanaMessageRequest.from_dict(sign_solana_message_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


