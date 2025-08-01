# PrepareUserOperationRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**network** | [**EvmUserOperationNetwork**](EvmUserOperationNetwork.md) |  | 
**calls** | [**List[EvmCall]**](EvmCall.md) | The list of calls to make from the Smart Account. | 
**paymaster_url** | **str** | The URL of the paymaster to use for the user operation. | [optional] 

## Example

```python
from cdp.openapi_client.models.prepare_user_operation_request import PrepareUserOperationRequest

# TODO update the JSON string below
json = "{}"
# create an instance of PrepareUserOperationRequest from a JSON string
prepare_user_operation_request_instance = PrepareUserOperationRequest.from_json(json)
# print the JSON string representation of the object
print(PrepareUserOperationRequest.to_json())

# convert the object into a dict
prepare_user_operation_request_dict = prepare_user_operation_request_instance.to_dict()
# create an instance of PrepareUserOperationRequest from a dict
prepare_user_operation_request_from_dict = PrepareUserOperationRequest.from_dict(prepare_user_operation_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


