# WebhookSubscriptionResponseMetadata

Additional metadata for the subscription.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**secret** | **str** | Secret for webhook signature validation. | [optional] 

## Example

```python
from cdp.openapi_client.models.webhook_subscription_response_metadata import WebhookSubscriptionResponseMetadata

# TODO update the JSON string below
json = "{}"
# create an instance of WebhookSubscriptionResponseMetadata from a JSON string
webhook_subscription_response_metadata_instance = WebhookSubscriptionResponseMetadata.from_json(json)
# print the JSON string representation of the object
print(WebhookSubscriptionResponseMetadata.to_json())

# convert the object into a dict
webhook_subscription_response_metadata_dict = webhook_subscription_response_metadata_instance.to_dict()
# create an instance of WebhookSubscriptionResponseMetadata from a dict
webhook_subscription_response_metadata_from_dict = WebhookSubscriptionResponseMetadata.from_dict(webhook_subscription_response_metadata_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


