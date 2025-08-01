# InitiateEmailAuthenticationResponse

The response body for an end user to initiate authentication using a one-time password sent to their email address.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**message** | **str** | The message to display to the end user. | 
**flow_id** | **str** | The ID of the authentication flow, used to correlate verification requests with the initiation request. | 
**next_step** | [**InitiateEmailAuthenticationNextStep**](InitiateEmailAuthenticationNextStep.md) |  | 

## Example

```python
from cdp.openapi_client.models.initiate_email_authentication_response import InitiateEmailAuthenticationResponse

# TODO update the JSON string below
json = "{}"
# create an instance of InitiateEmailAuthenticationResponse from a JSON string
initiate_email_authentication_response_instance = InitiateEmailAuthenticationResponse.from_json(json)
# print the JSON string representation of the object
print(InitiateEmailAuthenticationResponse.to_json())

# convert the object into a dict
initiate_email_authentication_response_dict = initiate_email_authentication_response_instance.to_dict()
# create an instance of InitiateEmailAuthenticationResponse from a dict
initiate_email_authentication_response_from_dict = InitiateEmailAuthenticationResponse.from_dict(initiate_email_authentication_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


