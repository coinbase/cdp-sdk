# X402DiscoveryResourcesResponse

Response containing discovered x402 resources.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**x402_version** | [**X402Version**](X402Version.md) |  | 
**items** | [**List[X402DiscoveryResource]**](X402DiscoveryResource.md) | List of discovered x402 resources. | 
**pagination** | [**X402DiscoveryResourcesResponsePagination**](X402DiscoveryResourcesResponsePagination.md) |  | 

## Example

```python
from cdp.openapi_client.models.x402_discovery_resources_response import X402DiscoveryResourcesResponse

# TODO update the JSON string below
json = "{}"
# create an instance of X402DiscoveryResourcesResponse from a JSON string
x402_discovery_resources_response_instance = X402DiscoveryResourcesResponse.from_json(json)
# print the JSON string representation of the object
print(X402DiscoveryResourcesResponse.to_json())

# convert the object into a dict
x402_discovery_resources_response_dict = x402_discovery_resources_response_instance.to_dict()
# create an instance of X402DiscoveryResourcesResponse from a dict
x402_discovery_resources_response_from_dict = X402DiscoveryResourcesResponse.from_dict(x402_discovery_resources_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


