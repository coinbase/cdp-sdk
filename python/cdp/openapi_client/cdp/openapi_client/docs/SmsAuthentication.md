# SmsAuthentication

Information about an end user who authenticates using a one-time password sent to their phone number via SMS.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | **str** | The type of authentication information. | 
**phone_number** | **str** | The phone number of the end user in E.164 format. | 

## Example

```python
from cdp.openapi_client.models.sms_authentication import SmsAuthentication

# TODO update the JSON string below
json = "{}"
# create an instance of SmsAuthentication from a JSON string
sms_authentication_instance = SmsAuthentication.from_json(json)
# print the JSON string representation of the object
print(SmsAuthentication.to_json())

# convert the object into a dict
sms_authentication_dict = sms_authentication_instance.to_dict()
# create an instance of SmsAuthentication from a dict
sms_authentication_from_dict = SmsAuthentication.from_dict(sms_authentication_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


