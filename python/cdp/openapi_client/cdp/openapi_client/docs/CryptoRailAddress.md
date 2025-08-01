# CryptoRailAddress

The crypto rail input object which specifies the symbol, network, and address which is the source or destination wallet address.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**currency** | **str** | The symbol of the currency of the payment rail. | 
**network** | **str** | The network of the payment rail. | 
**address** | **str** | The address of the payment rail. This is the source or destination wallet address. It is not a contract address. | 

## Example

```python
from cdp.openapi_client.models.crypto_rail_address import CryptoRailAddress

# TODO update the JSON string below
json = "{}"
# create an instance of CryptoRailAddress from a JSON string
crypto_rail_address_instance = CryptoRailAddress.from_json(json)
# print the JSON string representation of the object
print(CryptoRailAddress.to_json())

# convert the object into a dict
crypto_rail_address_dict = crypto_rail_address_instance.to_dict()
# create an instance of CryptoRailAddress from a dict
crypto_rail_address_from_dict = CryptoRailAddress.from_dict(crypto_rail_address_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


