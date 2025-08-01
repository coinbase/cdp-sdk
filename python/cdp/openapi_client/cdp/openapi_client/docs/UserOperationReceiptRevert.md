# UserOperationReceiptRevert

The revert data if the user operation has reverted.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**data** | **str** | The 0x-prefixed raw hex string. | 
**message** | **str** | Human-readable revert reason if able to decode. | 

## Example

```python
from cdp.openapi_client.models.user_operation_receipt_revert import UserOperationReceiptRevert

# TODO update the JSON string below
json = "{}"
# create an instance of UserOperationReceiptRevert from a JSON string
user_operation_receipt_revert_instance = UserOperationReceiptRevert.from_json(json)
# print the JSON string representation of the object
print(UserOperationReceiptRevert.to_json())

# convert the object into a dict
user_operation_receipt_revert_dict = user_operation_receipt_revert_instance.to_dict()
# create an instance of UserOperationReceiptRevert from a dict
user_operation_receipt_revert_from_dict = UserOperationReceiptRevert.from_dict(user_operation_receipt_revert_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


