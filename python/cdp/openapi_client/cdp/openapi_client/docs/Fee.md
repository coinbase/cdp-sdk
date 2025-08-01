# Fee

The fee for the transfer.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | **str** | The type of fee. | 
**amount** | **str** | The amount of the fee. | 
**currency** | **str** | The currency of the fee. | 
**description** | **str** | The description of the fee. | [optional] 

## Example

```python
from cdp.openapi_client.models.fee import Fee

# TODO update the JSON string below
json = "{}"
# create an instance of Fee from a JSON string
fee_instance = Fee.from_json(json)
# print the JSON string representation of the object
print(Fee.to_json())

# convert the object into a dict
fee_dict = fee_instance.to_dict()
# create an instance of Fee from a dict
fee_from_dict = Fee.from_dict(fee_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


