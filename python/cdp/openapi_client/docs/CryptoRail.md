# CryptoRail

The crypto rails available.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**currency** | **str** | The currency symbol of the asset. | 
**name** | **str** | The name of the asset. | 
**networks** | [**List[CryptoRailNetworksInner]**](CryptoRailNetworksInner.md) | All available networks of the asset. | 
**actions** | [**List[PaymentRailAction]**](PaymentRailAction.md) | The actions for the crypto rail. | 

## Example

```python
from cdp.openapi_client.models.crypto_rail import CryptoRail

# TODO update the JSON string below
json = "{}"
# create an instance of CryptoRail from a JSON string
crypto_rail_instance = CryptoRail.from_json(json)
# print the JSON string representation of the object
print(CryptoRail.to_json())

# convert the object into a dict
crypto_rail_dict = crypto_rail_instance.to_dict()
# create an instance of CryptoRail from a dict
crypto_rail_from_dict = CryptoRail.from_dict(crypto_rail_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


