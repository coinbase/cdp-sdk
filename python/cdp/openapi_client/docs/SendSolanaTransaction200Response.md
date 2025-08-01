# SendSolanaTransaction200Response


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**transaction_signature** | **str** | The base58 encoded transaction signature. | 

## Example

```python
from cdp.openapi_client.models.send_solana_transaction200_response import SendSolanaTransaction200Response

# TODO update the JSON string below
json = "{}"
# create an instance of SendSolanaTransaction200Response from a JSON string
send_solana_transaction200_response_instance = SendSolanaTransaction200Response.from_json(json)
# print the JSON string representation of the object
print(SendSolanaTransaction200Response.to_json())

# convert the object into a dict
send_solana_transaction200_response_dict = send_solana_transaction200_response_instance.to_dict()
# create an instance of SendSolanaTransaction200Response from a dict
send_solana_transaction200_response_from_dict = SendSolanaTransaction200Response.from_dict(send_solana_transaction200_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


