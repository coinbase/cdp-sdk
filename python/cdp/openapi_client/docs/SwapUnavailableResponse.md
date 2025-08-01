# SwapUnavailableResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**liquidity_available** | **bool** | Whether sufficient liquidity is available to settle the swap. All other fields in the response will be empty if this is false. | 

## Example

```python
from cdp.openapi_client.models.swap_unavailable_response import SwapUnavailableResponse

# TODO update the JSON string below
json = "{}"
# create an instance of SwapUnavailableResponse from a JSON string
swap_unavailable_response_instance = SwapUnavailableResponse.from_json(json)
# print the JSON string representation of the object
print(SwapUnavailableResponse.to_json())

# convert the object into a dict
swap_unavailable_response_dict = swap_unavailable_response_instance.to_dict()
# create an instance of SwapUnavailableResponse from a dict
swap_unavailable_response_from_dict = SwapUnavailableResponse.from_dict(swap_unavailable_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


