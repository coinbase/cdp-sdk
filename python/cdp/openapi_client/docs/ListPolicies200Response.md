# ListPolicies200Response


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**next_page_token** | **str** | The token for the next page of items, if any. | [optional] 
**policies** | [**List[Policy]**](Policy.md) | The list of policies. | 

## Example

```python
from cdp.openapi_client.models.list_policies200_response import ListPolicies200Response

# TODO update the JSON string below
json = "{}"
# create an instance of ListPolicies200Response from a JSON string
list_policies200_response_instance = ListPolicies200Response.from_json(json)
# print the JSON string representation of the object
print(ListPolicies200Response.to_json())

# convert the object into a dict
list_policies200_response_dict = list_policies200_response_instance.to_dict()
# create an instance of ListPolicies200Response from a dict
list_policies200_response_from_dict = ListPolicies200Response.from_dict(list_policies200_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


