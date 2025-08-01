# AddAllowedOrigin200Response


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**origin** | **str** | The origin that was added to the CORS configuration. | [optional] 

## Example

```python
from cdp.openapi_client.models.add_allowed_origin200_response import AddAllowedOrigin200Response

# TODO update the JSON string below
json = "{}"
# create an instance of AddAllowedOrigin200Response from a JSON string
add_allowed_origin200_response_instance = AddAllowedOrigin200Response.from_json(json)
# print the JSON string representation of the object
print(AddAllowedOrigin200Response.to_json())

# convert the object into a dict
add_allowed_origin200_response_dict = add_allowed_origin200_response_instance.to_dict()
# create an instance of AddAllowedOrigin200Response from a dict
add_allowed_origin200_response_from_dict = AddAllowedOrigin200Response.from_dict(add_allowed_origin200_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


