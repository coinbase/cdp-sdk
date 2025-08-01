# InitiateSmsAuthenticationRequest

The request body for an end user to initiate authentication using a one-time password sent to their phone number via SMS.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | **str** | The type of authentication information. | 
**phone_number** | **str** | The phone number of the end user in E.164 format. | 

## Example

```python
from cdp.openapi_client.models.initiate_sms_authentication_request import InitiateSmsAuthenticationRequest

# TODO update the JSON string below
json = "{}"
# create an instance of InitiateSmsAuthenticationRequest from a JSON string
initiate_sms_authentication_request_instance = InitiateSmsAuthenticationRequest.from_json(json)
# print the JSON string representation of the object
print(InitiateSmsAuthenticationRequest.to_json())

# convert the object into a dict
initiate_sms_authentication_request_dict = initiate_sms_authentication_request_instance.to_dict()
# create an instance of InitiateSmsAuthenticationRequest from a dict
initiate_sms_authentication_request_from_dict = InitiateSmsAuthenticationRequest.from_dict(initiate_sms_authentication_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


