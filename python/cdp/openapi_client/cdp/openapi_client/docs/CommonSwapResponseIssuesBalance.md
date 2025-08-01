# CommonSwapResponseIssuesBalance

Details of the balance of the `fromToken` that the `taker` must hold. Null if the `taker` has a sufficient balance.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**token** | **str** | The 0x-prefixed contract address of the token. | 
**current_balance** | **str** | The current balance of the &#x60;fromToken&#x60; by the &#x60;taker&#x60;. | 
**required_balance** | **str** | The amount of the token that the &#x60;taker&#x60; must hold. | 

## Example

```python
from cdp.openapi_client.models.common_swap_response_issues_balance import CommonSwapResponseIssuesBalance

# TODO update the JSON string below
json = "{}"
# create an instance of CommonSwapResponseIssuesBalance from a JSON string
common_swap_response_issues_balance_instance = CommonSwapResponseIssuesBalance.from_json(json)
# print the JSON string representation of the object
print(CommonSwapResponseIssuesBalance.to_json())

# convert the object into a dict
common_swap_response_issues_balance_dict = common_swap_response_issues_balance_instance.to_dict()
# create an instance of CommonSwapResponseIssuesBalance from a dict
common_swap_response_issues_balance_from_dict = CommonSwapResponseIssuesBalance.from_dict(common_swap_response_issues_balance_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


