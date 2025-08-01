# GetOnrampOrderById200Response


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**order** | [**OnrampOrder**](OnrampOrder.md) |  | 

## Example

```python
from cdp.openapi_client.models.get_onramp_order_by_id200_response import GetOnrampOrderById200Response

# TODO update the JSON string below
json = "{}"
# create an instance of GetOnrampOrderById200Response from a JSON string
get_onramp_order_by_id200_response_instance = GetOnrampOrderById200Response.from_json(json)
# print the JSON string representation of the object
print(GetOnrampOrderById200Response.to_json())

# convert the object into a dict
get_onramp_order_by_id200_response_dict = get_onramp_order_by_id200_response_instance.to_dict()
# create an instance of GetOnrampOrderById200Response from a dict
get_onramp_order_by_id200_response_from_dict = GetOnrampOrderById200Response.from_dict(get_onramp_order_by_id200_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


