# \EndUserAccountsApi

All URIs are relative to *https://api.cdp.coinbase.com/platform*

Method | HTTP request | Description
------------- | ------------- | -------------
[**validate_end_user_access_token**](EndUserAccountsApi.md#validate_end_user_access_token) | **POST** /v2/end-users/auth/validate-token | Validate end user access token



## validate_end_user_access_token

> models::EndUser validate_end_user_access_token(validate_end_user_access_token_request)
Validate end user access token

Validates the end user's access token and returns the end user's information. Returns an error if the access token is invalid or expired.  This API is intended to be used by the developer's own backend, and is authenticated using the developer's CDP API key.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**validate_end_user_access_token_request** | Option<[**ValidateEndUserAccessTokenRequest**](ValidateEndUserAccessTokenRequest.md)> |  |  |

### Return type

[**models::EndUser**](EndUser.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

