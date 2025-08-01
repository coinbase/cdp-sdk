# SignSolanaMessage200Response


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**signature** | **str** | The signature of the message, as a base58 encoded string. | 

## Example

```python
from cdp.openapi_client.models.sign_solana_message200_response import SignSolanaMessage200Response

# TODO update the JSON string below
json = "{}"
# create an instance of SignSolanaMessage200Response from a JSON string
sign_solana_message200_response_instance = SignSolanaMessage200Response.from_json(json)
# print the JSON string representation of the object
print(SignSolanaMessage200Response.to_json())

# convert the object into a dict
sign_solana_message200_response_dict = sign_solana_message200_response_instance.to_dict()
# create an instance of SignSolanaMessage200Response from a dict
sign_solana_message200_response_from_dict = SignSolanaMessage200Response.from_dict(sign_solana_message200_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


