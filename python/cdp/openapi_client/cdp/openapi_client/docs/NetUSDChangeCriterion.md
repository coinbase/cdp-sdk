# NetUSDChangeCriterion

A schema for specifying a criterion for the USD denominated asset transfer for a transaction. This includes native transfers, as well as any token transfers. If using within a `signEvmTypedData` rule, and the typed data contains a `value` uint in the primary message, then it will be used for comparison.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | **str** | The type of criterion to use. This should be &#x60;netUSDChange&#x60;. | 
**change_cents** | **int** | The amount of USD, in cents, that the total value of a transaction&#39;s asset transfer should be compared to. | 
**operator** | **str** | The operator to use for the comparison. The total value of a transaction&#39;s asset transfer will be on the left-hand side of the operator, and the &#x60;changeCents&#x60; field will be on the right-hand side. | 

## Example

```python
from cdp.openapi_client.models.net_usd_change_criterion import NetUSDChangeCriterion

# TODO update the JSON string below
json = "{}"
# create an instance of NetUSDChangeCriterion from a JSON string
net_usd_change_criterion_instance = NetUSDChangeCriterion.from_json(json)
# print the JSON string representation of the object
print(NetUSDChangeCriterion.to_json())

# convert the object into a dict
net_usd_change_criterion_dict = net_usd_change_criterion_instance.to_dict()
# create an instance of NetUSDChangeCriterion from a dict
net_usd_change_criterion_from_dict = NetUSDChangeCriterion.from_dict(net_usd_change_criterion_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


