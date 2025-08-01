# ListEvmSmartAccounts200Response


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**next_page_token** | **str** | The token for the next page of items, if any. | [optional] 
**accounts** | [**List[EvmSmartAccount]**](EvmSmartAccount.md) | The list of Smart Accounts. | 

## Example

```python
from cdp.openapi_client.models.list_evm_smart_accounts200_response import ListEvmSmartAccounts200Response

# TODO update the JSON string below
json = "{}"
# create an instance of ListEvmSmartAccounts200Response from a JSON string
list_evm_smart_accounts200_response_instance = ListEvmSmartAccounts200Response.from_json(json)
# print the JSON string representation of the object
print(ListEvmSmartAccounts200Response.to_json())

# convert the object into a dict
list_evm_smart_accounts200_response_dict = list_evm_smart_accounts200_response_instance.to_dict()
# create an instance of ListEvmSmartAccounts200Response from a dict
list_evm_smart_accounts200_response_from_dict = ListEvmSmartAccounts200Response.from_dict(list_evm_smart_accounts200_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


