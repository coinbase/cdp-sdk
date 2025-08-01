# SignEvmMessageWithEndUserAccount200Response


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**signature** | **str** | The signature of the message, as a 0x-prefixed hex string. | 

## Example

```python
from cdp.openapi_client.models.sign_evm_message_with_end_user_account200_response import SignEvmMessageWithEndUserAccount200Response

# TODO update the JSON string below
json = "{}"
# create an instance of SignEvmMessageWithEndUserAccount200Response from a JSON string
sign_evm_message_with_end_user_account200_response_instance = SignEvmMessageWithEndUserAccount200Response.from_json(json)
# print the JSON string representation of the object
print(SignEvmMessageWithEndUserAccount200Response.to_json())

# convert the object into a dict
sign_evm_message_with_end_user_account200_response_dict = sign_evm_message_with_end_user_account200_response_instance.to_dict()
# create an instance of SignEvmMessageWithEndUserAccount200Response from a dict
sign_evm_message_with_end_user_account200_response_from_dict = SignEvmMessageWithEndUserAccount200Response.from_dict(sign_evm_message_with_end_user_account200_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


