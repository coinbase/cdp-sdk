# X402DiscoveryResourcesResponsePagination

Pagination information for the response.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**limit** | **int** | The number of discovered x402 resources to return per page. | [optional] 
**offset** | **int** | The offset of the first discovered x402 resource to return. | [optional] 
**total** | **int** | The total number of discovered x402 resources. | [optional] 

## Example

```python
from cdp.openapi_client.models.x402_discovery_resources_response_pagination import X402DiscoveryResourcesResponsePagination

# TODO update the JSON string below
json = "{}"
# create an instance of X402DiscoveryResourcesResponsePagination from a JSON string
x402_discovery_resources_response_pagination_instance = X402DiscoveryResourcesResponsePagination.from_json(json)
# print the JSON string representation of the object
print(X402DiscoveryResourcesResponsePagination.to_json())

# convert the object into a dict
x402_discovery_resources_response_pagination_dict = x402_discovery_resources_response_pagination_instance.to_dict()
# create an instance of X402DiscoveryResourcesResponsePagination from a dict
x402_discovery_resources_response_pagination_from_dict = X402DiscoveryResourcesResponsePagination.from_dict(x402_discovery_resources_response_pagination_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


