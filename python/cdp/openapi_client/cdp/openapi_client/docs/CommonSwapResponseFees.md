# CommonSwapResponseFees

The estimated fees for the swap.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**gas_fee** | [**TokenFee**](TokenFee.md) | The estimated gas fee for the swap. | 
**protocol_fee** | [**TokenFee**](TokenFee.md) | The estimated protocol fee for the swap. | 

## Example

```python
from cdp.openapi_client.models.common_swap_response_fees import CommonSwapResponseFees

# TODO update the JSON string below
json = "{}"
# create an instance of CommonSwapResponseFees from a JSON string
common_swap_response_fees_instance = CommonSwapResponseFees.from_json(json)
# print the JSON string representation of the object
print(CommonSwapResponseFees.to_json())

# convert the object into a dict
common_swap_response_fees_dict = common_swap_response_fees_instance.to_dict()
# create an instance of CommonSwapResponseFees from a dict
common_swap_response_fees_from_dict = CommonSwapResponseFees.from_dict(common_swap_response_fees_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


