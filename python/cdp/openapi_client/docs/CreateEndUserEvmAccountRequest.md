# CreateEndUserEvmAccountRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**wallet_secret_id** | **str** | The ID of the Temporary Wallet Secret that was used to sign the X-Wallet-Auth Header. | [optional] 

## Example

```python
from cdp.openapi_client.models.create_end_user_evm_account_request import CreateEndUserEvmAccountRequest

# TODO update the JSON string below
json = "{}"
# create an instance of CreateEndUserEvmAccountRequest from a JSON string
create_end_user_evm_account_request_instance = CreateEndUserEvmAccountRequest.from_json(json)
# print the JSON string representation of the object
print(CreateEndUserEvmAccountRequest.to_json())

# convert the object into a dict
create_end_user_evm_account_request_dict = create_end_user_evm_account_request_instance.to_dict()
# create an instance of CreateEndUserEvmAccountRequest from a dict
create_end_user_evm_account_request_from_dict = CreateEndUserEvmAccountRequest.from_dict(create_end_user_evm_account_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


