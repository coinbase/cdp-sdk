# CryptoRailNetworksInner

The networks of the asset.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **str** | The name of the network. | [optional] 
**chain_id** | **int** | The chain ID of the network. | [optional] 
**contract_address** | **str** | The contract address of the asset on the network. | [optional] 

## Example

```python
from cdp.openapi_client.models.crypto_rail_networks_inner import CryptoRailNetworksInner

# TODO update the JSON string below
json = "{}"
# create an instance of CryptoRailNetworksInner from a JSON string
crypto_rail_networks_inner_instance = CryptoRailNetworksInner.from_json(json)
# print the JSON string representation of the object
print(CryptoRailNetworksInner.to_json())

# convert the object into a dict
crypto_rail_networks_inner_dict = crypto_rail_networks_inner_instance.to_dict()
# create an instance of CryptoRailNetworksInner from a dict
crypto_rail_networks_inner_from_dict = CryptoRailNetworksInner.from_dict(crypto_rail_networks_inner_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


