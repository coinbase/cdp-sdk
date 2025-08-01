# RevokeSpendPermissionRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**network** | **str** | The network of the spend permission. | 
**permission_hash** | **str** | The hash of the spend permission to revoke. | 
**paymaster_url** | **str** | The paymaster URL of the spend permission. | [optional] 

## Example

```python
from cdp.openapi_client.models.revoke_spend_permission_request import RevokeSpendPermissionRequest

# TODO update the JSON string below
json = "{}"
# create an instance of RevokeSpendPermissionRequest from a JSON string
revoke_spend_permission_request_instance = RevokeSpendPermissionRequest.from_json(json)
# print the JSON string representation of the object
print(RevokeSpendPermissionRequest.to_json())

# convert the object into a dict
revoke_spend_permission_request_dict = revoke_spend_permission_request_instance.to_dict()
# create an instance of RevokeSpendPermissionRequest from a dict
revoke_spend_permission_request_from_dict = RevokeSpendPermissionRequest.from_dict(revoke_spend_permission_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


