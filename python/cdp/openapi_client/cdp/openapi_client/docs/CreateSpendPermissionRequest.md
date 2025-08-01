# CreateSpendPermissionRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**network** | **str** | The network of the spend permission. | 
**account** | **str** | Smart account this spend permission is valid for. | 
**spender** | **str** | Entity that can spend account&#39;s tokens. | 
**token** | **str** | Token address (ERC-7528 native token address or ERC-20 contract). | 
**allowance** | **str** | Maximum allowed value to spend, in atomic units for the specified token, within each period. | 
**period** | **str** | Time duration for resetting used allowance on a recurring basis (seconds). | 
**start** | **str** | The start time for this spend permission, in Unix seconds. | 
**end** | **str** | The expiration time for this spend permission, in Unix seconds. | 
**salt** | **str** | An arbitrary salt to differentiate unique spend permissions with otherwise identical data. | [optional] 
**extra_data** | **str** | Arbitrary data to include in the permission. | [optional] 
**paymaster_url** | **str** | The paymaster URL of the spend permission. | [optional] 

## Example

```python
from cdp.openapi_client.models.create_spend_permission_request import CreateSpendPermissionRequest

# TODO update the JSON string below
json = "{}"
# create an instance of CreateSpendPermissionRequest from a JSON string
create_spend_permission_request_instance = CreateSpendPermissionRequest.from_json(json)
# print the JSON string representation of the object
print(CreateSpendPermissionRequest.to_json())

# convert the object into a dict
create_spend_permission_request_dict = create_spend_permission_request_instance.to_dict()
# create an instance of CreateSpendPermissionRequest from a dict
create_spend_permission_request_from_dict = CreateSpendPermissionRequest.from_dict(create_spend_permission_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


