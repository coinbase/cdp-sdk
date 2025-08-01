# EvmCall


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**to** | **str** | The address the call is directed to. | 
**value** | **str** | The amount of ETH to send with the call, in wei. | 
**data** | **str** | The call data to send. This is the hex-encoded data of the function call consisting of the method selector and the function arguments. | 

## Example

```python
from cdp.openapi_client.models.evm_call import EvmCall

# TODO update the JSON string below
json = "{}"
# create an instance of EvmCall from a JSON string
evm_call_instance = EvmCall.from_json(json)
# print the JSON string representation of the object
print(EvmCall.to_json())

# convert the object into a dict
evm_call_dict = evm_call_instance.to_dict()
# create an instance of EvmCall from a dict
evm_call_from_dict = EvmCall.from_dict(evm_call_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


