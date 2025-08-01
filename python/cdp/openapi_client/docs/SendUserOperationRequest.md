# SendUserOperationRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**signature** | **str** | The hex-encoded signature of the user operation. This should be a 65-byte signature consisting of the &#x60;r&#x60;, &#x60;s&#x60;, and &#x60;v&#x60; values of the ECDSA signature. Note that the &#x60;v&#x60; value should conform to the &#x60;personal_sign&#x60; standard, which means it should be 27 or 28. | 

## Example

```python
from cdp.openapi_client.models.send_user_operation_request import SendUserOperationRequest

# TODO update the JSON string below
json = "{}"
# create an instance of SendUserOperationRequest from a JSON string
send_user_operation_request_instance = SendUserOperationRequest.from_json(json)
# print the JSON string representation of the object
print(SendUserOperationRequest.to_json())

# convert the object into a dict
send_user_operation_request_dict = send_user_operation_request_instance.to_dict()
# create an instance of SendUserOperationRequest from a dict
send_user_operation_request_from_dict = SendUserOperationRequest.from_dict(send_user_operation_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


