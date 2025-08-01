# OnrampPaymentLink

A payment link to pay for an order.  Please refer to the [Onramp docs](https://docs.cdp.coinbase.com/onramp-&-offramp/onramp-apis/onramp-overview) for details on how to integrate with the different payment link types.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**url** | **str** | The URL to the hosted widget the user should be redirected to, append your own redirect_url query parameter to  this URL to ensure the user is redirected back to your app after the widget completes. | 
**payment_link_type** | [**OnrampPaymentLinkType**](OnrampPaymentLinkType.md) |  | 

## Example

```python
from cdp.openapi_client.models.onramp_payment_link import OnrampPaymentLink

# TODO update the JSON string below
json = "{}"
# create an instance of OnrampPaymentLink from a JSON string
onramp_payment_link_instance = OnrampPaymentLink.from_json(json)
# print the JSON string representation of the object
print(OnrampPaymentLink.to_json())

# convert the object into a dict
onramp_payment_link_dict = onramp_payment_link_instance.to_dict()
# create an instance of OnrampPaymentLink from a dict
onramp_payment_link_from_dict = OnrampPaymentLink.from_dict(onramp_payment_link_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


