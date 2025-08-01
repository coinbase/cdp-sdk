# UserOperationReceipt

The receipt that contains information about the execution of user operation.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**revert** | [**UserOperationReceiptRevert**](UserOperationReceiptRevert.md) |  | [optional] 

## Example

```python
from cdp.openapi_client.models.user_operation_receipt import UserOperationReceipt

# TODO update the JSON string below
json = "{}"
# create an instance of UserOperationReceipt from a JSON string
user_operation_receipt_instance = UserOperationReceipt.from_json(json)
# print the JSON string representation of the object
print(UserOperationReceipt.to_json())

# convert the object into a dict
user_operation_receipt_dict = user_operation_receipt_instance.to_dict()
# create an instance of UserOperationReceipt from a dict
user_operation_receipt_from_dict = UserOperationReceipt.from_dict(user_operation_receipt_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


