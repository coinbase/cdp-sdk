# VerifyX402Payment200Response


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**is_valid** | **bool** | Indicates whether the payment is valid. | 
**invalid_reason** | [**X402VerifyInvalidReason**](X402VerifyInvalidReason.md) |  | [optional] 
**payer** | **str** | The onchain address of the client that is paying for the resource.  For EVM networks, the payer will be a 0x-prefixed, checksum EVM address.  For Solana-based networks, the payer will be a base58-encoded Solana address. | 

## Example

```python
from cdp.openapi_client.models.verify_x402_payment200_response import VerifyX402Payment200Response

# TODO update the JSON string below
json = "{}"
# create an instance of VerifyX402Payment200Response from a JSON string
verify_x402_payment200_response_instance = VerifyX402Payment200Response.from_json(json)
# print the JSON string representation of the object
print(VerifyX402Payment200Response.to_json())

# convert the object into a dict
verify_x402_payment200_response_dict = verify_x402_payment200_response_instance.to_dict()
# create an instance of VerifyX402Payment200Response from a dict
verify_x402_payment200_response_from_dict = VerifyX402Payment200Response.from_dict(verify_x402_payment200_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


