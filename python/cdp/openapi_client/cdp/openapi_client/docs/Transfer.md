# Transfer

The transfer object.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **str** | The ID of the transfer. | 
**source_type** | **str** | The type of the source of the transfer. | 
**source** | [**TransferSource**](TransferSource.md) |  | 
**target_type** | **str** | The type of the target of the transfer. | 
**target** | [**TransferTarget**](TransferTarget.md) |  | 
**source_amount** | **str** | The amount the source will transfer. | 
**source_currency** | **str** | The currency the source will transfer. | 
**target_amount** | **str** | The amount the target will receive. | 
**target_currency** | **str** | The currency the target will receive. | 
**user_amount** | **str** | The amount the customer put in to transfer. | 
**user_currency** | **str** | The currency the customer put in to transfer. | 
**fees** | [**List[Fee]**](Fee.md) | The fees for the transfer. | 
**status** | **str** | The status of the transfer. | 
**created_at** | **str** | The UTC date and time in ISO 8601 format the transfer was created. | 
**updated_at** | **str** | The UTC date and time in ISO 8601 format the transfer was updated. | 
**transaction_hash** | **str** | The transaction hash or transaction signature of the transfer. | [optional] 

## Example

```python
from cdp.openapi_client.models.transfer import Transfer

# TODO update the JSON string below
json = "{}"
# create an instance of Transfer from a JSON string
transfer_instance = Transfer.from_json(json)
# print the JSON string representation of the object
print(Transfer.to_json())

# convert the object into a dict
transfer_dict = transfer_instance.to_dict()
# create an instance of Transfer from a dict
transfer_from_dict = Transfer.from_dict(transfer_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


