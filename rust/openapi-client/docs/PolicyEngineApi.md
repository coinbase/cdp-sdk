# \PolicyEngineApi

All URIs are relative to *https://api.cdp.coinbase.com/platform*

Method | HTTP request | Description
------------- | ------------- | -------------
[**create_policy**](PolicyEngineApi.md#create_policy) | **POST** /v2/policy-engine/policies | Create a policy
[**delete_policy**](PolicyEngineApi.md#delete_policy) | **DELETE** /v2/policy-engine/policies/{policyId} | Delete a policy
[**get_policy_by_id**](PolicyEngineApi.md#get_policy_by_id) | **GET** /v2/policy-engine/policies/{policyId} | Get a policy by ID
[**list_policies**](PolicyEngineApi.md#list_policies) | **GET** /v2/policy-engine/policies | List policies
[**update_policy**](PolicyEngineApi.md#update_policy) | **PUT** /v2/policy-engine/policies/{policyId} | Update a policy



## create_policy

> models::Policy create_policy(create_policy_request, x_idempotency_key)
Create a policy

Create a policy that can be used to govern the behavior of accounts.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**create_policy_request** | [**CreatePolicyRequest**](CreatePolicyRequest.md) |  | [required] |
**x_idempotency_key** | Option<**String**> | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  |  |

### Return type

[**models::Policy**](Policy.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## delete_policy

> delete_policy(policy_id, x_idempotency_key)
Delete a policy

Delete a policy by its ID. This will have the effect of removing the policy from all accounts that are currently using it.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**policy_id** | **String** | The ID of the policy to delete. | [required] |
**x_idempotency_key** | Option<**String**> | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  |  |

### Return type

 (empty response body)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## get_policy_by_id

> models::Policy get_policy_by_id(policy_id)
Get a policy by ID

Get a policy by its ID.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**policy_id** | **String** | The ID of the policy to get. | [required] |

### Return type

[**models::Policy**](Policy.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## list_policies

> models::ListPolicies200Response list_policies(page_size, page_token, scope)
List policies

Lists the policies belonging to the developer's CDP Project. Use the `scope` parameter to filter the policies by scope. The response is paginated, and by default, returns 20 policies per page.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**page_size** | Option<**i32**> | The number of policies to return per page. |  |[default to 20]
**page_token** | Option<**String**> | The token for the next page of policies, if any. |  |
**scope** | Option<**String**> | The scope of the policies to return. If `project`, the response will include exactly one policy, which is the project-level policy. If `account`, the response will include all account-level policies for the developer's CDP Project. |  |

### Return type

[**models::ListPolicies200Response**](listPolicies_200_response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## update_policy

> models::Policy update_policy(policy_id, update_policy_request, x_idempotency_key)
Update a policy

Updates a policy by its ID. This will have the effect of applying the updated policy to all accounts that are currently using it.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**policy_id** | **String** | The ID of the policy to update. | [required] |
**update_policy_request** | [**UpdatePolicyRequest**](UpdatePolicyRequest.md) |  | [required] |
**x_idempotency_key** | Option<**String**> | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  |  |

### Return type

[**models::Policy**](Policy.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

