# VerifyEmailAuthenticationRequest

The request body for an end user to verify their email address using a one-time password.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**flow_id** | **str** | The ID of the authentication flow, used to correlate verification requests with the initiation request. | 
**otp** | **str** | The one-time password sent to the end user&#39;s email address. | 

## Example

```python
from cdp.openapi_client.models.verify_email_authentication_request import VerifyEmailAuthenticationRequest

# TODO update the JSON string below
json = "{}"
# create an instance of VerifyEmailAuthenticationRequest from a JSON string
verify_email_authentication_request_instance = VerifyEmailAuthenticationRequest.from_json(json)
# print the JSON string representation of the object
print(VerifyEmailAuthenticationRequest.to_json())

# convert the object into a dict
verify_email_authentication_request_dict = verify_email_authentication_request_instance.to_dict()
# create an instance of VerifyEmailAuthenticationRequest from a dict
verify_email_authentication_request_from_dict = VerifyEmailAuthenticationRequest.from_dict(verify_email_authentication_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


