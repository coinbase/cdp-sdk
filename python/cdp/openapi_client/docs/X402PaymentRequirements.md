# X402PaymentRequirements

The x402 protocol payment requirements that the resource server expects the client's payment payload to meet.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**scheme** | **str** | The scheme of the payment protocol to use. Currently, the only supported scheme is &#x60;exact&#x60;. | 
**network** | **str** | The network of the blockchain to send payment on. | 
**max_amount_required** | **str** | The maximum amount required to pay for the resource in atomic units of the payment asset. | 
**resource** | **str** | The URL of the resource to pay for. | 
**description** | **str** | The description of the resource. | 
**mime_type** | **str** | The MIME type of the resource response. | 
**output_schema** | **Dict[str, object]** | The optional JSON schema describing the resource output. | [optional] 
**pay_to** | **str** | The destination to pay value to.  For EVM networks, payTo will be a 0x-prefixed, checksum EVM address.  For Solana-based networks, payTo will be a base58-encoded Solana address. | 
**max_timeout_seconds** | **int** | The maximum time in seconds for the resource server to respond. | 
**asset** | **str** | The asset to pay with.  For EVM networks, the asset will be a 0x-prefixed, checksum EVM address.  For Solana-based networks, the asset will be a base58-encoded Solana address. | 
**extra** | **Dict[str, object]** | The optional additional scheme-specific payment info. | [optional] 

## Example

```python
from cdp.openapi_client.models.x402_payment_requirements import X402PaymentRequirements

# TODO update the JSON string below
json = "{}"
# create an instance of X402PaymentRequirements from a JSON string
x402_payment_requirements_instance = X402PaymentRequirements.from_json(json)
# print the JSON string representation of the object
print(X402PaymentRequirements.to_json())

# convert the object into a dict
x402_payment_requirements_dict = x402_payment_requirements_instance.to_dict()
# create an instance of X402PaymentRequirements from a dict
x402_payment_requirements_from_dict = X402PaymentRequirements.from_dict(x402_payment_requirements_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


