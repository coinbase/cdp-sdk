# TransferSource

The source of the transfer.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **str** | The ID of the payment method. | 

## Example

```python
from cdp.openapi_client.models.transfer_source import TransferSource

# TODO update the JSON string below
json = "{}"
# create an instance of TransferSource from a JSON string
transfer_source_instance = TransferSource.from_json(json)
# print the JSON string representation of the object
print(TransferSource.to_json())

# convert the object into a dict
transfer_source_dict = transfer_source_instance.to_dict()
# create an instance of TransferSource from a dict
transfer_source_from_dict = TransferSource.from_dict(transfer_source_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


