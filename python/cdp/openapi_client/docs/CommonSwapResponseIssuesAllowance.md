# CommonSwapResponseIssuesAllowance

Details of the allowances that the taker must set in order to execute the swap successfully. Null if no allowance is required.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**current_allowance** | **str** | The current allowance of the &#x60;fromToken&#x60; by the &#x60;taker&#x60;. | 
**spender** | **str** | The 0x-prefixed address of to set the allowance on. | 

## Example

```python
from cdp.openapi_client.models.common_swap_response_issues_allowance import CommonSwapResponseIssuesAllowance

# TODO update the JSON string below
json = "{}"
# create an instance of CommonSwapResponseIssuesAllowance from a JSON string
common_swap_response_issues_allowance_instance = CommonSwapResponseIssuesAllowance.from_json(json)
# print the JSON string representation of the object
print(CommonSwapResponseIssuesAllowance.to_json())

# convert the object into a dict
common_swap_response_issues_allowance_dict = common_swap_response_issues_allowance_instance.to_dict()
# create an instance of CommonSwapResponseIssuesAllowance from a dict
common_swap_response_issues_allowance_from_dict = CommonSwapResponseIssuesAllowance.from_dict(common_swap_response_issues_allowance_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


