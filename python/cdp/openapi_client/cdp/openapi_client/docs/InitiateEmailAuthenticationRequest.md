# InitiateEmailAuthenticationRequest

The request body for an end user to initiate authentication using a one-time password sent to their email address.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | **str** | The type of authentication information. | 
**email** | **str** | The email address of the end user. | 

## Example

```python
from cdp.openapi_client.models.initiate_email_authentication_request import InitiateEmailAuthenticationRequest

# TODO update the JSON string below
json = "{}"
# create an instance of InitiateEmailAuthenticationRequest from a JSON string
initiate_email_authentication_request_instance = InitiateEmailAuthenticationRequest.from_json(json)
# print the JSON string representation of the object
print(InitiateEmailAuthenticationRequest.to_json())

# convert the object into a dict
initiate_email_authentication_request_dict = initiate_email_authentication_request_instance.to_dict()
# create an instance of InitiateEmailAuthenticationRequest from a dict
initiate_email_authentication_request_from_dict = InitiateEmailAuthenticationRequest.from_dict(initiate_email_authentication_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


