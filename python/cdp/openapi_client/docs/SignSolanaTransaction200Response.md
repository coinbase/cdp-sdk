# SignSolanaTransaction200Response


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**signed_transaction** | **str** | The base64 encoded signed transaction. | 

## Example

```python
from cdp.openapi_client.models.sign_solana_transaction200_response import SignSolanaTransaction200Response

# TODO update the JSON string below
json = "{}"
# create an instance of SignSolanaTransaction200Response from a JSON string
sign_solana_transaction200_response_instance = SignSolanaTransaction200Response.from_json(json)
# print the JSON string representation of the object
print(SignSolanaTransaction200Response.to_json())

# convert the object into a dict
sign_solana_transaction200_response_dict = sign_solana_transaction200_response_instance.to_dict()
# create an instance of SignSolanaTransaction200Response from a dict
sign_solana_transaction200_response_from_dict = SignSolanaTransaction200Response.from_dict(sign_solana_transaction200_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


