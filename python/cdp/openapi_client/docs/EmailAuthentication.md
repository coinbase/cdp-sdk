# EmailAuthentication

Information about an end user who authenticates using a one-time password sent to their email address.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | **str** | The type of authentication information. | 
**email** | **str** | The email address of the end user. | 

## Example

```python
from cdp.openapi_client.models.email_authentication import EmailAuthentication

# TODO update the JSON string below
json = "{}"
# create an instance of EmailAuthentication from a JSON string
email_authentication_instance = EmailAuthentication.from_json(json)
# print the JSON string representation of the object
print(EmailAuthentication.to_json())

# convert the object into a dict
email_authentication_dict = email_authentication_instance.to_dict()
# create an instance of EmailAuthentication from a dict
email_authentication_from_dict = EmailAuthentication.from_dict(email_authentication_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


