# CreatePaymentTransferQuoteRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**source_type** | **str** | The type of the source of the transfer. | 
**source** | [**TransferSource**](TransferSource.md) |  | 
**target_type** | **str** | The type of the target of the transfer. | 
**target** | [**TransferTarget**](TransferTarget.md) |  | 
**amount** | **str** | The amount of the transfer, which is either for the source currency to buy, or the target currency to receive. | 
**currency** | **str** | The currency of the transfer. This can be specified as the source currency, which would be used to buy, or else the target currency, which is how much will be received. | 
**execute** | **bool** | Whether to execute the transfer. If true, the transfer will be committed and executed. If false, the quote will be generated and returned. | [optional] [default to False]

## Example

```python
from cdp.openapi_client.models.create_payment_transfer_quote_request import CreatePaymentTransferQuoteRequest

# TODO update the JSON string below
json = "{}"
# create an instance of CreatePaymentTransferQuoteRequest from a JSON string
create_payment_transfer_quote_request_instance = CreatePaymentTransferQuoteRequest.from_json(json)
# print the JSON string representation of the object
print(CreatePaymentTransferQuoteRequest.to_json())

# convert the object into a dict
create_payment_transfer_quote_request_dict = create_payment_transfer_quote_request_instance.to_dict()
# create an instance of CreatePaymentTransferQuoteRequest from a dict
create_payment_transfer_quote_request_from_dict = CreatePaymentTransferQuoteRequest.from_dict(create_payment_transfer_quote_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


