# TransferTarget

The target of the transfer.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**currency** | **str** | The symbol of the currency of the payment rail. | 
**network** | **str** | The network of the payment rail. | 
**address** | **str** | The address of the payment rail. This is the source or destination wallet address. It is not a contract address. | 

## Example

```python
from cdp.openapi_client.models.transfer_target import TransferTarget

# TODO update the JSON string below
json = "{}"
# create an instance of TransferTarget from a JSON string
transfer_target_instance = TransferTarget.from_json(json)
# print the JSON string representation of the object
print(TransferTarget.to_json())

# convert the object into a dict
transfer_target_dict = transfer_target_instance.to_dict()
# create an instance of TransferTarget from a dict
transfer_target_from_dict = TransferTarget.from_dict(transfer_target_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


