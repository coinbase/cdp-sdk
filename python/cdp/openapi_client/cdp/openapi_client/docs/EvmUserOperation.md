# EvmUserOperation


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**network** | [**EvmUserOperationNetwork**](EvmUserOperationNetwork.md) |  | 
**user_op_hash** | **str** | The hash of the user operation. This is not the transaction hash, as a transaction consists of multiple user operations. The user operation hash is the hash of this particular user operation which gets signed by the owner of the Smart Account. | 
**calls** | [**List[EvmCall]**](EvmCall.md) | The list of calls in the user operation. | 
**status** | **str** | The status of the user operation. | 
**transaction_hash** | **str** | The hash of the transaction that included this particular user operation. This gets set after the user operation is broadcasted and the transaction is included in a block. | [optional] 
**receipts** | [**List[UserOperationReceipt]**](UserOperationReceipt.md) | The list of receipts associated with the user operation. | [optional] 

## Example

```python
from cdp.openapi_client.models.evm_user_operation import EvmUserOperation

# TODO update the JSON string below
json = "{}"
# create an instance of EvmUserOperation from a JSON string
evm_user_operation_instance = EvmUserOperation.from_json(json)
# print the JSON string representation of the object
print(EvmUserOperation.to_json())

# convert the object into a dict
evm_user_operation_dict = evm_user_operation_instance.to_dict()
# create an instance of EvmUserOperation from a dict
evm_user_operation_from_dict = EvmUserOperation.from_dict(evm_user_operation_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


