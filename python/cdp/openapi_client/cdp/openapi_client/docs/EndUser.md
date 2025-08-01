# EndUser

Information about the end user.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**user_id** | **str** | A stable, unique identifier for the end user. The &#x60;userId&#x60; must be unique across all end users in the developer&#39;s CDP Project. It must be between 1 and 100 characters long and can only contain alphanumeric characters and hyphens. | 
**authentication_methods** | [**List[AuthenticationMethod]**](AuthenticationMethod.md) | The list of valid authentication methods linked to the end user. | 
**evm_accounts** | **List[str]** | The list of EVM accounts associated with the end user. Currently, only one EVM account is supported per end user. | 
**solana_accounts** | **List[str]** | The list of Solana accounts associated with the end user. Currently, only one Solana account is supported per end user. | 

## Example

```python
from cdp.openapi_client.models.end_user import EndUser

# TODO update the JSON string below
json = "{}"
# create an instance of EndUser from a JSON string
end_user_instance = EndUser.from_json(json)
# print the JSON string representation of the object
print(EndUser.to_json())

# convert the object into a dict
end_user_dict = end_user_instance.to_dict()
# create an instance of EndUser from a dict
end_user_from_dict = EndUser.from_dict(end_user_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


