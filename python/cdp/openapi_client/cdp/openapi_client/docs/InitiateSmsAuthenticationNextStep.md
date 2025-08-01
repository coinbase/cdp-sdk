# InitiateSmsAuthenticationNextStep

The next step in the flow of the end user initiating authentication using a one-time password sent to their phone number via SMS.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | **str** | The type of the next step. | 
**url** | **str** | The URL at which to send the verification code. | 

## Example

```python
from cdp.openapi_client.models.initiate_sms_authentication_next_step import InitiateSmsAuthenticationNextStep

# TODO update the JSON string below
json = "{}"
# create an instance of InitiateSmsAuthenticationNextStep from a JSON string
initiate_sms_authentication_next_step_instance = InitiateSmsAuthenticationNextStep.from_json(json)
# print the JSON string representation of the object
print(InitiateSmsAuthenticationNextStep.to_json())

# convert the object into a dict
initiate_sms_authentication_next_step_dict = initiate_sms_authentication_next_step_instance.to_dict()
# create an instance of InitiateSmsAuthenticationNextStep from a dict
initiate_sms_authentication_next_step_from_dict = InitiateSmsAuthenticationNextStep.from_dict(initiate_sms_authentication_next_step_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


