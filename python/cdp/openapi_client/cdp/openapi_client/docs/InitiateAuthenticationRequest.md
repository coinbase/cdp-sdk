# InitiateAuthenticationRequest

The request body for an end user to initiate authentication.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | **str** | The type of authentication information. | 
**email** | **str** | The email address of the end user. | 
**phone_number** | **str** | The phone number of the end user in E.164 format. | 

## Example

```python
from cdp.openapi_client.models.initiate_authentication_request import InitiateAuthenticationRequest

# TODO update the JSON string below
json = "{}"
# create an instance of InitiateAuthenticationRequest from a JSON string
initiate_authentication_request_instance = InitiateAuthenticationRequest.from_json(json)
# print the JSON string representation of the object
print(InitiateAuthenticationRequest.to_json())

# convert the object into a dict
initiate_authentication_request_dict = initiate_authentication_request_instance.to_dict()
# create an instance of InitiateAuthenticationRequest from a dict
initiate_authentication_request_from_dict = InitiateAuthenticationRequest.from_dict(initiate_authentication_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


