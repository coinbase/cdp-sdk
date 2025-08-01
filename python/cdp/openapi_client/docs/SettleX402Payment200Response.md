# SettleX402Payment200Response


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**success** | **bool** | Indicates whether the payment settlement is successful. | 
**error_reason** | [**X402SettleErrorReason**](X402SettleErrorReason.md) |  | [optional] 
**payer** | **str** | The onchain address of the client that is paying for the resource.  For EVM networks, the payer will be a 0x-prefixed, checksum EVM address.  For Solana-based networks, the payer will be a base58-encoded Solana address. | 
**transaction** | **str** | The transaction of the settlement. For EVM networks, the transaction will be a 0x-prefixed, EVM transaction hash. For Solana-based networks, the transaction will be a base58-encoded Solana signature. | 
**network** | **str** | The network where the settlement occurred. | 

## Example

```python
from cdp.openapi_client.models.settle_x402_payment200_response import SettleX402Payment200Response

# TODO update the JSON string below
json = "{}"
# create an instance of SettleX402Payment200Response from a JSON string
settle_x402_payment200_response_instance = SettleX402Payment200Response.from_json(json)
# print the JSON string representation of the object
print(SettleX402Payment200Response.to_json())

# convert the object into a dict
settle_x402_payment200_response_dict = settle_x402_payment200_response_instance.to_dict()
# create an instance of SettleX402Payment200Response from a dict
settle_x402_payment200_response_from_dict = SettleX402Payment200Response.from_dict(settle_x402_payment200_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


