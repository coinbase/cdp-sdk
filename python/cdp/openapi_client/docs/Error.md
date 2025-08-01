# Error

An error response including the code for the type of error and a human-readable message describing the error.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**error_type** | [**ErrorType**](ErrorType.md) |  | 
**error_message** | **str** | The error message. | 
**correlation_id** | **str** | A unique identifier for the request that generated the error. This can be used to help debug issues with the API. | [optional] 
**error_link** | **str** | A link to the corresponding error documentation. | [optional] 

## Example

```python
from cdp.openapi_client.models.error import Error

# TODO update the JSON string below
json = "{}"
# create an instance of Error from a JSON string
error_instance = Error.from_json(json)
# print the JSON string representation of the object
print(Error.to_json())

# convert the object into a dict
error_dict = error_instance.to_dict()
# create an instance of Error from a dict
error_from_dict = Error.from_dict(error_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


