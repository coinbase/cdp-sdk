# InitiateAuthentication200Response


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**message** | **str** | The message to display to the end user. | 
**flow_id** | **str** | The ID of the authentication flow, used to correlate verification requests with the initiation request. | 
**next_step** | [**InitiateSmsAuthenticationNextStep**](InitiateSmsAuthenticationNextStep.md) |  | 

## Example

```python
from cdp.openapi_client.models.initiate_authentication200_response import InitiateAuthentication200Response

# TODO update the JSON string below
json = "{}"
# create an instance of InitiateAuthentication200Response from a JSON string
initiate_authentication200_response_instance = InitiateAuthentication200Response.from_json(json)
# print the JSON string representation of the object
print(InitiateAuthentication200Response.to_json())

# convert the object into a dict
initiate_authentication200_response_dict = initiate_authentication200_response_instance.to_dict()
# create an instance of InitiateAuthentication200Response from a dict
initiate_authentication200_response_from_dict = InitiateAuthentication200Response.from_dict(initiate_authentication200_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


