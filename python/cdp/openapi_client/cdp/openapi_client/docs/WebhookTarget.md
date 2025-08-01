# WebhookTarget

Target configuration for webhook delivery. Specifies the destination URL and any custom headers to include in webhook requests. 

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**url** | **str** | The webhook URL to deliver events to. | 
**headers** | **Dict[str, str]** | Additional headers to include in webhook requests. | [optional] 

## Example

```python
from cdp.openapi_client.models.webhook_target import WebhookTarget

# TODO update the JSON string below
json = "{}"
# create an instance of WebhookTarget from a JSON string
webhook_target_instance = WebhookTarget.from_json(json)
# print the JSON string representation of the object
print(WebhookTarget.to_json())

# convert the object into a dict
webhook_target_dict = webhook_target_instance.to_dict()
# create an instance of WebhookTarget from a dict
webhook_target_from_dict = WebhookTarget.from_dict(webhook_target_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


