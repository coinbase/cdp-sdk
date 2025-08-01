# InitiateEmailAuthenticationNextStep

The next step in the flow of the end user initiating authentication using a one-time password sent to their email address.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | **str** | The type of the next step. | 
**url** | **str** | The URL at which to send the verification code. | 

## Example

```python
from cdp.openapi_client.models.initiate_email_authentication_next_step import InitiateEmailAuthenticationNextStep

# TODO update the JSON string below
json = "{}"
# create an instance of InitiateEmailAuthenticationNextStep from a JSON string
initiate_email_authentication_next_step_instance = InitiateEmailAuthenticationNextStep.from_json(json)
# print the JSON string representation of the object
print(InitiateEmailAuthenticationNextStep.to_json())

# convert the object into a dict
initiate_email_authentication_next_step_dict = initiate_email_authentication_next_step_instance.to_dict()
# create an instance of InitiateEmailAuthenticationNextStep from a dict
initiate_email_authentication_next_step_from_dict = InitiateEmailAuthenticationNextStep.from_dict(initiate_email_authentication_next_step_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


