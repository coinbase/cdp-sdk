# SendEvmTransactionCriteriaInner


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | **str** | The type of criterion to use. This should be &#x60;ethValue&#x60;. | 
**eth_value** | **str** | The amount of ETH, in wei, that the transaction&#39;s &#x60;value&#x60; field should be compared to. | 
**operator** | **str** | The operator to use for the comparison. The total value of a transaction&#39;s asset transfer will be on the left-hand side of the operator, and the &#x60;changeCents&#x60; field will be on the right-hand side. | 
**addresses** | **List[str]** | A list of 0x-prefixed EVM addresses that the transaction&#39;s &#x60;to&#x60; field should be compared to. There is a limit of 300 addresses per criterion. | 
**networks** | **List[str]** | A list of EVM network identifiers that the transaction&#39;s intended &#x60;network&#x60; should be compared to. | 
**abi** | [**EvmDataCriterionAbi**](EvmDataCriterionAbi.md) |  | 
**conditions** | [**List[EvmDataCondition]**](EvmDataCondition.md) | A list of conditions to apply against the function and encoded arguments in the transaction&#39;s &#x60;data&#x60; field. Each condition must be met in order for this policy to be accepted or rejected. | 
**change_cents** | **int** | The amount of USD, in cents, that the total value of a transaction&#39;s asset transfer should be compared to. | 

## Example

```python
from cdp.openapi_client.models.send_evm_transaction_criteria_inner import SendEvmTransactionCriteriaInner

# TODO update the JSON string below
json = "{}"
# create an instance of SendEvmTransactionCriteriaInner from a JSON string
send_evm_transaction_criteria_inner_instance = SendEvmTransactionCriteriaInner.from_json(json)
# print the JSON string representation of the object
print(SendEvmTransactionCriteriaInner.to_json())

# convert the object into a dict
send_evm_transaction_criteria_inner_dict = send_evm_transaction_criteria_inner_instance.to_dict()
# create an instance of SendEvmTransactionCriteriaInner from a dict
send_evm_transaction_criteria_inner_from_dict = SendEvmTransactionCriteriaInner.from_dict(send_evm_transaction_criteria_inner_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


