# RefreshAccessToken200Response


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**end_user** | [**EndUser**](EndUser.md) |  | 
**access_token** | **str** | The refreshed access token for the end user. | 
**valid_until** | **datetime** | The date and time at which the refreshed access token will expire in ISO 8601 format. | 

## Example

```python
from cdp.openapi_client.models.refresh_access_token200_response import RefreshAccessToken200Response

# TODO update the JSON string below
json = "{}"
# create an instance of RefreshAccessToken200Response from a JSON string
refresh_access_token200_response_instance = RefreshAccessToken200Response.from_json(json)
# print the JSON string representation of the object
print(RefreshAccessToken200Response.to_json())

# convert the object into a dict
refresh_access_token200_response_dict = refresh_access_token200_response_instance.to_dict()
# create an instance of RefreshAccessToken200Response from a dict
refresh_access_token200_response_from_dict = RefreshAccessToken200Response.from_dict(refresh_access_token200_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


