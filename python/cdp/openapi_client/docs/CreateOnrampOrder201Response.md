# CreateOnrampOrder201Response


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**order** | [**OnrampOrder**](OnrampOrder.md) |  | 
**payment_link** | [**OnrampPaymentLink**](OnrampPaymentLink.md) |  | [optional] 

## Example

```python
from cdp.openapi_client.models.create_onramp_order201_response import CreateOnrampOrder201Response

# TODO update the JSON string below
json = "{}"
# create an instance of CreateOnrampOrder201Response from a JSON string
create_onramp_order201_response_instance = CreateOnrampOrder201Response.from_json(json)
# print the JSON string representation of the object
print(CreateOnrampOrder201Response.to_json())

# convert the object into a dict
create_onramp_order201_response_dict = create_onramp_order201_response_instance.to_dict()
# create an instance of CreateOnrampOrder201Response from a dict
create_onramp_order201_response_from_dict = CreateOnrampOrder201Response.from_dict(create_onramp_order201_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


