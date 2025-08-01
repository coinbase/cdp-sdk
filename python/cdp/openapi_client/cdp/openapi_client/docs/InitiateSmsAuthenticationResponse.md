# InitiateSmsAuthenticationResponse

The response body for an end user to initiate authentication using a one-time password sent to their phone number via SMS.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**message** | **str** | The message to display to the end user. | 
**flow_id** | **str** | The ID of the authentication flow, used to correlate verification requests with the initiation request. | 
**next_step** | [**InitiateSmsAuthenticationNextStep**](InitiateSmsAuthenticationNextStep.md) |  | 

## Example

```python
from cdp.openapi_client.models.initiate_sms_authentication_response import InitiateSmsAuthenticationResponse

# TODO update the JSON string below
json = "{}"
# create an instance of InitiateSmsAuthenticationResponse from a JSON string
initiate_sms_authentication_response_instance = InitiateSmsAuthenticationResponse.from_json(json)
# print the JSON string representation of the object
print(InitiateSmsAuthenticationResponse.to_json())

# convert the object into a dict
initiate_sms_authentication_response_dict = initiate_sms_authentication_response_instance.to_dict()
# create an instance of InitiateSmsAuthenticationResponse from a dict
initiate_sms_authentication_response_from_dict = InitiateSmsAuthenticationResponse.from_dict(initiate_sms_authentication_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


