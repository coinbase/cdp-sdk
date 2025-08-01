# CreateEndUserRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**user_id** | **str** | A stable, unique identifier for the end user. The &#x60;userId&#x60; must be unique across all end users in the developer&#39;s CDP Project. It must be between 1 and 100 characters long and can only contain alphanumeric characters and hyphens.  If &#x60;userId&#x60; is not provided in the request, the server will generate a random UUID. | [optional] 
**authentication_methods** | [**List[AuthenticationMethod]**](AuthenticationMethod.md) | The list of valid authentication methods linked to the end user. | 

## Example

```python
from cdp.openapi_client.models.create_end_user_request import CreateEndUserRequest

# TODO update the JSON string below
json = "{}"
# create an instance of CreateEndUserRequest from a JSON string
create_end_user_request_instance = CreateEndUserRequest.from_json(json)
# print the JSON string representation of the object
print(CreateEndUserRequest.to_json())

# convert the object into a dict
create_end_user_request_dict = create_end_user_request_instance.to_dict()
# create an instance of CreateEndUserRequest from a dict
create_end_user_request_from_dict = CreateEndUserRequest.from_dict(create_end_user_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


