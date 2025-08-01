# TokenBalance


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**amount** | [**TokenAmount**](TokenAmount.md) |  | 
**token** | [**Token**](Token.md) |  | 

## Example

```python
from cdp.openapi_client.models.token_balance import TokenBalance

# TODO update the JSON string below
json = "{}"
# create an instance of TokenBalance from a JSON string
token_balance_instance = TokenBalance.from_json(json)
# print the JSON string representation of the object
print(TokenBalance.to_json())

# convert the object into a dict
token_balance_dict = token_balance_instance.to_dict()
# create an instance of TokenBalance from a dict
token_balance_from_dict = TokenBalance.from_dict(token_balance_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


