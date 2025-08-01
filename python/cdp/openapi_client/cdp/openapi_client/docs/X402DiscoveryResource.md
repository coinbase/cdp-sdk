# X402DiscoveryResource

A single discovered x402 resource.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**resource** | **str** | The normalized resource identifier. | 
**type** | **str** | Communication protocol (e.g., \&quot;http\&quot;, \&quot;mcp\&quot;). | 
**x402_version** | [**X402Version**](X402Version.md) |  | 
**accepts** | [**List[X402PaymentRequirements]**](X402PaymentRequirements.md) | Payment requirements as an array of JSON objects. | [optional] 
**last_updated** | **datetime** | Timestamp of the last update. | 
**metadata** | **Dict[str, object]** | Additional metadata as a JSON object. | [optional] 

## Example

```python
from cdp.openapi_client.models.x402_discovery_resource import X402DiscoveryResource

# TODO update the JSON string below
json = "{}"
# create an instance of X402DiscoveryResource from a JSON string
x402_discovery_resource_instance = X402DiscoveryResource.from_json(json)
# print the JSON string representation of the object
print(X402DiscoveryResource.to_json())

# convert the object into a dict
x402_discovery_resource_dict = x402_discovery_resource_instance.to_dict()
# create an instance of X402DiscoveryResource from a dict
x402_discovery_resource_from_dict = X402DiscoveryResource.from_dict(x402_discovery_resource_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


