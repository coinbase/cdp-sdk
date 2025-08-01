# cdp.openapi_client.PolicyEngineApi

All URIs are relative to *https://api.cdp.coinbase.com/platform*

Method | HTTP request | Description
------------- | ------------- | -------------
[**create_policy**](PolicyEngineApi.md#create_policy) | **POST** /v2/policy-engine/policies | Create a policy
[**delete_policy**](PolicyEngineApi.md#delete_policy) | **DELETE** /v2/policy-engine/policies/{policyId} | Delete a policy
[**get_policy_by_id**](PolicyEngineApi.md#get_policy_by_id) | **GET** /v2/policy-engine/policies/{policyId} | Get a policy by ID
[**list_policies**](PolicyEngineApi.md#list_policies) | **GET** /v2/policy-engine/policies | List policies
[**update_policy**](PolicyEngineApi.md#update_policy) | **PUT** /v2/policy-engine/policies/{policyId} | Update a policy


# **create_policy**
> Policy create_policy(create_policy_request, x_idempotency_key=x_idempotency_key)

Create a policy

Create a policy that can be used to govern the behavior of accounts.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.create_policy_request import CreatePolicyRequest
from cdp.openapi_client.models.policy import Policy
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
    api_instance = cdp.openapi_client.PolicyEngineApi(api_client)
    create_policy_request = cdp.openapi_client.CreatePolicyRequest() # CreatePolicyRequest | 
    x_idempotency_key = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  (optional)

    try:
        # Create a policy
        api_response = await api_instance.create_policy(create_policy_request, x_idempotency_key=x_idempotency_key)
        print("The response of PolicyEngineApi->create_policy:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling PolicyEngineApi->create_policy: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **create_policy_request** | [**CreatePolicyRequest**](CreatePolicyRequest.md)|  | 
 **x_idempotency_key** | **str**| An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  | [optional] 

### Return type

[**Policy**](Policy.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth), [sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**201** | Successfully created policy. |  -  |
**400** | Invalid request. |  -  |
**409** | The resource already exists. |  -  |
**422** | Idempotency key conflict. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **delete_policy**
> delete_policy(policy_id, x_idempotency_key=x_idempotency_key)

Delete a policy

Delete a policy by its ID. This will have the effect of removing the policy from all accounts that are currently using it.

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
    api_instance = cdp.openapi_client.PolicyEngineApi(api_client)
    policy_id = '123e4567-e89b-12d3-a456-426614174000' # str | The ID of the policy to delete.
    x_idempotency_key = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  (optional)

    try:
        # Delete a policy
        await api_instance.delete_policy(policy_id, x_idempotency_key=x_idempotency_key)
    except Exception as e:
        print("Exception when calling PolicyEngineApi->delete_policy: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **policy_id** | **str**| The ID of the policy to delete. | 
 **x_idempotency_key** | **str**| An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  | [optional] 

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
**204** | Successfully deleted policy. |  -  |
**400** | Unable to delete policy. |  -  |
**404** | Policy not found. |  -  |
**409** | The resource already exists. |  -  |
**422** | Idempotency key conflict. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_policy_by_id**
> Policy get_policy_by_id(policy_id)

Get a policy by ID

Get a policy by its ID.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.policy import Policy
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
    api_instance = cdp.openapi_client.PolicyEngineApi(api_client)
    policy_id = '123e4567-e89b-12d3-a456-426614174000' # str | The ID of the policy to get.

    try:
        # Get a policy by ID
        api_response = await api_instance.get_policy_by_id(policy_id)
        print("The response of PolicyEngineApi->get_policy_by_id:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling PolicyEngineApi->get_policy_by_id: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **policy_id** | **str**| The ID of the policy to get. | 

### Return type

[**Policy**](Policy.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth), [sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully retrieved policy. |  -  |
**404** | Policy not found. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **list_policies**
> ListPolicies200Response list_policies(page_size=page_size, page_token=page_token, scope=scope)

List policies

Lists the policies belonging to the developer's CDP Project. Use the `scope` parameter to filter the policies by scope. The response is paginated, and by default, returns 20 policies per page.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.list_policies200_response import ListPolicies200Response
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
    api_instance = cdp.openapi_client.PolicyEngineApi(api_client)
    page_size = 20 # int | The number of policies to return per page. (optional) (default to 20)
    page_token = 'eyJsYXN0X2lkIjogImFiYzEyMyIsICJ0aW1lc3RhbXAiOiAxNzA3ODIzNzAxfQ==' # str | The token for the next page of policies, if any. (optional)
    scope = 'project' # str | The scope of the policies to return. If `project`, the response will include exactly one policy, which is the project-level policy. If `account`, the response will include all account-level policies for the developer's CDP Project. (optional)

    try:
        # List policies
        api_response = await api_instance.list_policies(page_size=page_size, page_token=page_token, scope=scope)
        print("The response of PolicyEngineApi->list_policies:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling PolicyEngineApi->list_policies: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **page_size** | **int**| The number of policies to return per page. | [optional] [default to 20]
 **page_token** | **str**| The token for the next page of policies, if any. | [optional] 
 **scope** | **str**| The scope of the policies to return. If &#x60;project&#x60;, the response will include exactly one policy, which is the project-level policy. If &#x60;account&#x60;, the response will include all account-level policies for the developer&#39;s CDP Project. | [optional] 

### Return type

[**ListPolicies200Response**](ListPolicies200Response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth), [sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully listed policies. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **update_policy**
> Policy update_policy(policy_id, update_policy_request, x_idempotency_key=x_idempotency_key)

Update a policy

Updates a policy by its ID. This will have the effect of applying the updated policy to all accounts that are currently using it.

### Example

* Bearer (JWT) Authentication (apiKeyAuth):

```python
import cdp.openapi_client
from cdp.openapi_client.models.policy import Policy
from cdp.openapi_client.models.update_policy_request import UpdatePolicyRequest
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
    api_instance = cdp.openapi_client.PolicyEngineApi(api_client)
    policy_id = '123e4567-e89b-12d3-a456-426614174000' # str | The ID of the policy to update.
    update_policy_request = cdp.openapi_client.UpdatePolicyRequest() # UpdatePolicyRequest | 
    x_idempotency_key = '8e03978e-40d5-43e8-bc93-6894a57f9324' # str | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  (optional)

    try:
        # Update a policy
        api_response = await api_instance.update_policy(policy_id, update_policy_request, x_idempotency_key=x_idempotency_key)
        print("The response of PolicyEngineApi->update_policy:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling PolicyEngineApi->update_policy: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **policy_id** | **str**| The ID of the policy to update. | 
 **update_policy_request** | [**UpdatePolicyRequest**](UpdatePolicyRequest.md)|  | 
 **x_idempotency_key** | **str**| An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  | [optional] 

### Return type

[**Policy**](Policy.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth), [sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully updated policy. |  -  |
**400** | Invalid request. |  -  |
**404** | Policy not found. |  -  |
**409** | The resource already exists. |  -  |
**422** | Idempotency key conflict. |  -  |
**500** | Internal server error. |  -  |
**502** | Bad gateway. |  -  |
**503** | Service unavailable. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

