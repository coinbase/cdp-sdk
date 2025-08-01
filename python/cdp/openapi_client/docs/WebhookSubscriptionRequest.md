# WebhookSubscriptionRequest

Request to create a new webhook subscription.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**description** | **str** | Description of the webhook subscription. | [optional] 
**event_types** | **List[str]** | Types of events to subscribe to. Event types follow a three-part dot-separated format:  service.resource.verb (e.g., \&quot;wallet.transaction.created\&quot;, \&quot;token.transfer.completed\&quot;). The subscription will only receive events matching these types AND the label filter.  | 
**is_enabled** | **bool** | Whether the subscription is enabled. | 
**label_key** | **str** | Label key for filtering events. Each subscription filters on exactly one (labelKey, labelValue) pair  in addition to the event types. Only events matching both the event types AND this label filter will be delivered.  | 
**label_value** | **str** | Label value for filtering events. Must correspond to the labelKey (e.g., contract address for contract_address key). Only events with this exact label value will be delivered.  | 
**metadata** | **Dict[str, object]** | Additional metadata for the subscription. | [optional] 
**target** | [**WebhookTarget**](WebhookTarget.md) |  | 

## Example

```python
from cdp.openapi_client.models.webhook_subscription_request import WebhookSubscriptionRequest

# TODO update the JSON string below
json = "{}"
# create an instance of WebhookSubscriptionRequest from a JSON string
webhook_subscription_request_instance = WebhookSubscriptionRequest.from_json(json)
# print the JSON string representation of the object
print(WebhookSubscriptionRequest.to_json())

# convert the object into a dict
webhook_subscription_request_dict = webhook_subscription_request_instance.to_dict()
# create an instance of WebhookSubscriptionRequest from a dict
webhook_subscription_request_from_dict = WebhookSubscriptionRequest.from_dict(webhook_subscription_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


