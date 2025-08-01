# SignEvmMessageRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**message** | **str** | The message to sign. | 

## Example

```python
from cdp.openapi_client.models.sign_evm_message_request import SignEvmMessageRequest

# TODO update the JSON string below
json = "{}"
# create an instance of SignEvmMessageRequest from a JSON string
sign_evm_message_request_instance = SignEvmMessageRequest.from_json(json)
# print the JSON string representation of the object
print(SignEvmMessageRequest.to_json())

# convert the object into a dict
sign_evm_message_request_dict = sign_evm_message_request_instance.to_dict()
# create an instance of SignEvmMessageRequest from a dict
sign_evm_message_request_from_dict = SignEvmMessageRequest.from_dict(sign_evm_message_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


