# CommonSwapResponseIssues

An object containing potential issues discovered during validation that could prevent the swap from being executed successfully.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**allowance** | [**CommonSwapResponseIssuesAllowance**](CommonSwapResponseIssuesAllowance.md) |  | 
**balance** | [**CommonSwapResponseIssuesBalance**](CommonSwapResponseIssuesBalance.md) |  | 
**simulation_incomplete** | **bool** | This is set to true when the transaction cannot be validated. This can happen when the taker has an insufficient balance of the &#x60;fromToken&#x60;. Note that this does not necessarily mean that the trade will revert. | 

## Example

```python
from cdp.openapi_client.models.common_swap_response_issues import CommonSwapResponseIssues

# TODO update the JSON string below
json = "{}"
# create an instance of CommonSwapResponseIssues from a JSON string
common_swap_response_issues_instance = CommonSwapResponseIssues.from_json(json)
# print the JSON string representation of the object
print(CommonSwapResponseIssues.to_json())

# convert the object into a dict
common_swap_response_issues_dict = common_swap_response_issues_instance.to_dict()
# create an instance of CommonSwapResponseIssues from a dict
common_swap_response_issues_from_dict = CommonSwapResponseIssues.from_dict(common_swap_response_issues_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


