# RemoveAllowedOriginRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**origin** | **str** | The origin to remove from the CORS configuration. | 

## Example

```python
from cdp.openapi_client.models.remove_allowed_origin_request import RemoveAllowedOriginRequest

# TODO update the JSON string below
json = "{}"
# create an instance of RemoveAllowedOriginRequest from a JSON string
remove_allowed_origin_request_instance = RemoveAllowedOriginRequest.from_json(json)
# print the JSON string representation of the object
print(RemoveAllowedOriginRequest.to_json())

# convert the object into a dict
remove_allowed_origin_request_dict = remove_allowed_origin_request_instance.to_dict()
# create an instance of RemoveAllowedOriginRequest from a dict
remove_allowed_origin_request_from_dict = RemoveAllowedOriginRequest.from_dict(remove_allowed_origin_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


