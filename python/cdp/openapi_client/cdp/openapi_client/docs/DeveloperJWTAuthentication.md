# DeveloperJWTAuthentication

Information about an end user who authenticates using a JWT issued by the developer.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | **str** | The type of authentication information. | 
**kid** | **str** | The key ID of the JWK used to sign the JWT. | 
**sub** | **str** | The unique identifier for the end user that is captured in the &#x60;sub&#x60; claim of the JWT. | 

## Example

```python
from cdp.openapi_client.models.developer_jwt_authentication import DeveloperJWTAuthentication

# TODO update the JSON string below
json = "{}"
# create an instance of DeveloperJWTAuthentication from a JSON string
developer_jwt_authentication_instance = DeveloperJWTAuthentication.from_json(json)
# print the JSON string representation of the object
print(DeveloperJWTAuthentication.to_json())

# convert the object into a dict
developer_jwt_authentication_dict = developer_jwt_authentication_instance.to_dict()
# create an instance of DeveloperJWTAuthentication from a dict
developer_jwt_authentication_from_dict = DeveloperJWTAuthentication.from_dict(developer_jwt_authentication_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


