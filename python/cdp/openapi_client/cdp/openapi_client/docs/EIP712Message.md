# EIP712Message

The message to sign using EIP-712.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**domain** | [**EIP712Domain**](EIP712Domain.md) |  | 
**types** | **object** | A mapping of struct names to an array of type objects (name + type). Each key corresponds to a type name (e.g., \&quot;&#x60;EIP712Domain&#x60;\&quot;, \&quot;&#x60;PermitTransferFrom&#x60;\&quot;).  | 
**primary_type** | **str** | The primary type of the message. This is the name of the struct in the &#x60;types&#x60; object that is the root of the message. | 
**message** | **object** | The message to sign. The structure of this message must match the &#x60;primaryType&#x60; struct in the &#x60;types&#x60; object. | 

## Example

```python
from cdp.openapi_client.models.eip712_message import EIP712Message

# TODO update the JSON string below
json = "{}"
# create an instance of EIP712Message from a JSON string
eip712_message_instance = EIP712Message.from_json(json)
# print the JSON string representation of the object
print(EIP712Message.to_json())

# convert the object into a dict
eip712_message_dict = eip712_message_instance.to_dict()
# create an instance of EIP712Message from a dict
eip712_message_from_dict = EIP712Message.from_dict(eip712_message_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


