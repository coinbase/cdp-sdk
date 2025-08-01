# AuthenticationMethod

Information about how the end user is authenticated.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | **str** | The type of authentication information. | 
**email** | **str** | The email address of the end user. | 
**phone_number** | **str** | The phone number of the end user in E.164 format. | 
**kid** | **str** | The key ID of the JWK used to sign the JWT. | 
**sub** | **str** | The unique identifier for the end user that is captured in the &#x60;sub&#x60; claim of the JWT. | 

## Example

```python
from cdp.openapi_client.models.authentication_method import AuthenticationMethod

# TODO update the JSON string below
json = "{}"
# create an instance of AuthenticationMethod from a JSON string
authentication_method_instance = AuthenticationMethod.from_json(json)
# print the JSON string representation of the object
print(AuthenticationMethod.to_json())

# convert the object into a dict
authentication_method_dict = authentication_method_instance.to_dict()
# create an instance of AuthenticationMethod from a dict
authentication_method_from_dict = AuthenticationMethod.from_dict(authentication_method_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


