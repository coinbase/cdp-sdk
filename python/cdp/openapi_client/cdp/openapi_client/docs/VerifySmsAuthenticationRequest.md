# VerifySmsAuthenticationRequest

The request body for an end user to verify their phone number using a one-time password.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**flow_id** | **str** | The ID of the authentication flow, used to correlate verification requests with the initiation request. | 
**otp** | **str** | The one-time password sent to the end user&#39;s phone number via SMS. | 

## Example

```python
from cdp.openapi_client.models.verify_sms_authentication_request import VerifySmsAuthenticationRequest

# TODO update the JSON string below
json = "{}"
# create an instance of VerifySmsAuthenticationRequest from a JSON string
verify_sms_authentication_request_instance = VerifySmsAuthenticationRequest.from_json(json)
# print the JSON string representation of the object
print(VerifySmsAuthenticationRequest.to_json())

# convert the object into a dict
verify_sms_authentication_request_dict = verify_sms_authentication_request_instance.to_dict()
# create an instance of VerifySmsAuthenticationRequest from a dict
verify_sms_authentication_request_from_dict = VerifySmsAuthenticationRequest.from_dict(verify_sms_authentication_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


