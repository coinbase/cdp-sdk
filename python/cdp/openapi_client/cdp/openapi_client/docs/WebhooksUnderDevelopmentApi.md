# cdp.openapi_client.WebhooksUnderDevelopmentApi

All URIs are relative to *https://api.cdp.coinbase.com/platform*

Method | HTTP request | Description
------------- | ------------- | -------------
[**create_webhook_subscription**](WebhooksUnderDevelopmentApi.md#create_webhook_subscription) | **POST** /v2/data/webhooks/subscriptions | Create webhook subscription
[**delete_webhook_subscription**](WebhooksUnderDevelopmentApi.md#delete_webhook_subscription) | **DELETE** /v2/data/webhooks/subscriptions/{subscriptionId} | Delete webhook subscription
[**get_webhook_subscription**](WebhooksUnderDevelopmentApi.md#get_webhook_subscription) | **GET** /v2/data/webhooks/subscriptions/{subscriptionId} | Get webhook subscription details
[**update_webhook_subscription**](WebhooksUnderDevelopmentApi.md#update_webhook_subscription) | **PUT** /v2/data/webhooks/subscriptions/{subscriptionId} | Update webhook subscription


# **create_webhook_subscription**
> WebhookSubscriptionResponse create_webhook_subscription(webhook_subscription_request)

Create webhook subscription

Create a webhook subscription to receive real-time blockchain event notifications. Specify event types, target URL, and filtering criteria to monitor specific on-chain activities. 

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.webhook_subscription_request import WebhookSubscriptionRequest
from cdp.openapi_client.models.webhook_subscription_response import WebhookSubscriptionResponse
from cdp.openapi_client.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.cdp.coinbase.com/platform
# See configuration.py for a list of all supported configuration parameters.
configuration = cdp.openapi_client.Configuration(
    host = "https://api.cdp.coinbase.com/platform"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure Bearer authorization (JWT): apiKeyAuth
configuration = cdp.openapi_client.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
async with cdp.openapi_client.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = cdp.openapi_client.WebhooksUnderDevelopmentApi(api_client)
    webhook_subscription_request = cdp.openapi_client.WebhookSubscriptionRequest() # WebhookSubscriptionRequest | 

    try:
        # Create webhook subscription
        api_response = await api_instance.create_webhook_subscription(webhook_subscription_request)
        print("The response of WebhooksUnderDevelopmentApi->create_webhook_subscription:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling WebhooksUnderDevelopmentApi->create_webhook_subscription: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **webhook_subscription_request** | [**WebhookSubscriptionRequest**](WebhookSubscriptionRequest.md)|  | 

### Return type

[**WebhookSubscriptionResponse**](WebhookSubscriptionResponse.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth), [sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**201** | Webhook subscription created successfully. |  -  |
**400** | Invalid subscription configuration. |  -  |
**401** | Unauthorized. |  -  |
**429** | Rate limit exceeded. |  -  |
**500** | Internal server error. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **delete_webhook_subscription**
> delete_webhook_subscription(subscription_id)

Delete webhook subscription

Permanently delete a webhook subscription and stop all event deliveries. This action cannot be undone. 

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.cdp.coinbase.com/platform
# See configuration.py for a list of all supported configuration parameters.
configuration = cdp.openapi_client.Configuration(
    host = "https://api.cdp.coinbase.com/platform"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure Bearer authorization (JWT): apiKeyAuth
configuration = cdp.openapi_client.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
async with cdp.openapi_client.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = cdp.openapi_client.WebhooksUnderDevelopmentApi(api_client)
    subscription_id = '123e4567-e89b-12d3-a456-426614174000' # str | Unique identifier for the webhook subscription.

    try:
        # Delete webhook subscription
        await api_instance.delete_webhook_subscription(subscription_id)
    except Exception as e:
        print("Exception when calling WebhooksUnderDevelopmentApi->delete_webhook_subscription: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **subscription_id** | **str**| Unique identifier for the webhook subscription. | 

### Return type

void (empty response body)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth), [sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**204** | Webhook subscription deleted successfully. |  -  |
**401** | Unauthorized. |  -  |
**404** | Webhook subscription not found. |  -  |
**429** | Rate limit exceeded. |  -  |
**500** | Internal server error. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_webhook_subscription**
> WebhookSubscriptionResponse get_webhook_subscription(subscription_id)

Get webhook subscription details

Retrieve detailed information about a specific webhook subscription including configuration, status, and creation timestamp. 

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.webhook_subscription_response import WebhookSubscriptionResponse
from cdp.openapi_client.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.cdp.coinbase.com/platform
# See configuration.py for a list of all supported configuration parameters.
configuration = cdp.openapi_client.Configuration(
    host = "https://api.cdp.coinbase.com/platform"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure Bearer authorization (JWT): apiKeyAuth
configuration = cdp.openapi_client.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
async with cdp.openapi_client.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = cdp.openapi_client.WebhooksUnderDevelopmentApi(api_client)
    subscription_id = '123e4567-e89b-12d3-a456-426614174000' # str | Unique identifier for the webhook subscription.

    try:
        # Get webhook subscription details
        api_response = await api_instance.get_webhook_subscription(subscription_id)
        print("The response of WebhooksUnderDevelopmentApi->get_webhook_subscription:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling WebhooksUnderDevelopmentApi->get_webhook_subscription: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **subscription_id** | **str**| Unique identifier for the webhook subscription. | 

### Return type

[**WebhookSubscriptionResponse**](WebhookSubscriptionResponse.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth), [sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Webhook subscription details retrieved successfully. |  -  |
**401** | Unauthorized. |  -  |
**404** | Webhook subscription not found. |  -  |
**429** | Rate limit exceeded. |  -  |
**500** | Internal server error. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **update_webhook_subscription**
> WebhookSubscriptionResponse update_webhook_subscription(subscription_id, webhook_subscription_update_request)

Update webhook subscription

Update an existing webhook subscription's configuration including event types, target URL, filtering criteria, and enabled status. All required fields must be provided, even if they are not being changed. 

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.webhook_subscription_response import WebhookSubscriptionResponse
from cdp.openapi_client.models.webhook_subscription_update_request import WebhookSubscriptionUpdateRequest
from cdp.openapi_client.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.cdp.coinbase.com/platform
# See configuration.py for a list of all supported configuration parameters.
configuration = cdp.openapi_client.Configuration(
    host = "https://api.cdp.coinbase.com/platform"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure Bearer authorization (JWT): apiKeyAuth
configuration = cdp.openapi_client.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
async with cdp.openapi_client.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = cdp.openapi_client.WebhooksUnderDevelopmentApi(api_client)
    subscription_id = '123e4567-e89b-12d3-a456-426614174000' # str | Unique identifier for the webhook subscription.
    webhook_subscription_update_request = cdp.openapi_client.WebhookSubscriptionUpdateRequest() # WebhookSubscriptionUpdateRequest | 

    try:
        # Update webhook subscription
        api_response = await api_instance.update_webhook_subscription(subscription_id, webhook_subscription_update_request)
        print("The response of WebhooksUnderDevelopmentApi->update_webhook_subscription:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling WebhooksUnderDevelopmentApi->update_webhook_subscription: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **subscription_id** | **str**| Unique identifier for the webhook subscription. | 
 **webhook_subscription_update_request** | [**WebhookSubscriptionUpdateRequest**](WebhookSubscriptionUpdateRequest.md)|  | 

### Return type

[**WebhookSubscriptionResponse**](WebhookSubscriptionResponse.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth), [sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Webhook subscription updated successfully. |  -  |
**400** | Invalid subscription update configuration. |  -  |
**401** | Unauthorized. |  -  |
**404** | Webhook subscription not found. |  -  |
**429** | Rate limit exceeded. |  -  |
**500** | Internal server error. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

