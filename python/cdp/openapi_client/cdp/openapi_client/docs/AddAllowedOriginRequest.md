# AddAllowedOriginRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**origin** | **str** | The origin to add to the CORS configuration. | 

## Example

```python
from cdp.openapi_client.models.add_allowed_origin_request import AddAllowedOriginRequest

# TODO update the JSON string below
json = "{}"
# create an instance of AddAllowedOriginRequest from a JSON string
add_allowed_origin_request_instance = AddAllowedOriginRequest.from_json(json)
# print the JSON string representation of the object
print(AddAllowedOriginRequest.to_json())

# convert the object into a dict
add_allowed_origin_request_dict = add_allowed_origin_request_instance.to_dict()
# create an instance of AddAllowedOriginRequest from a dict
add_allowed_origin_request_from_dict = AddAllowedOriginRequest.from_dict(add_allowed_origin_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


