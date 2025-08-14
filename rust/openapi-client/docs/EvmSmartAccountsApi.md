# \EvmSmartAccountsApi

All URIs are relative to *https://api.cdp.coinbase.com/platform*

Method | HTTP request | Description
------------- | ------------- | -------------
[**create_evm_smart_account**](EvmSmartAccountsApi.md#create_evm_smart_account) | **POST** /v2/evm/smart-accounts | Create a Smart Account
[**create_spend_permission**](EvmSmartAccountsApi.md#create_spend_permission) | **POST** /v2/evm/smart-accounts/{address}/spend-permissions | Create a spend permission
[**get_evm_smart_account**](EvmSmartAccountsApi.md#get_evm_smart_account) | **GET** /v2/evm/smart-accounts/{address} | Get a Smart Account by address
[**get_evm_smart_account_by_name**](EvmSmartAccountsApi.md#get_evm_smart_account_by_name) | **GET** /v2/evm/smart-accounts/by-name/{name} | Get a Smart Account by name
[**get_user_operation**](EvmSmartAccountsApi.md#get_user_operation) | **GET** /v2/evm/smart-accounts/{address}/user-operations/{userOpHash} | Get a user operation
[**list_evm_smart_accounts**](EvmSmartAccountsApi.md#list_evm_smart_accounts) | **GET** /v2/evm/smart-accounts | List Smart Accounts
[**list_spend_permissions**](EvmSmartAccountsApi.md#list_spend_permissions) | **GET** /v2/evm/smart-accounts/{address}/spend-permissions/list | List spend permissions
[**prepare_user_operation**](EvmSmartAccountsApi.md#prepare_user_operation) | **POST** /v2/evm/smart-accounts/{address}/user-operations | Prepare a user operation
[**revoke_spend_permission**](EvmSmartAccountsApi.md#revoke_spend_permission) | **POST** /v2/evm/smart-accounts/{address}/spend-permissions/revoke | Revoke a spend permission
[**send_user_operation**](EvmSmartAccountsApi.md#send_user_operation) | **POST** /v2/evm/smart-accounts/{address}/user-operations/{userOpHash}/send | Send a user operation
[**update_evm_smart_account**](EvmSmartAccountsApi.md#update_evm_smart_account) | **PUT** /v2/evm/smart-accounts/{address} | Update an EVM Smart Account



## create_evm_smart_account

> models::EvmSmartAccount create_evm_smart_account(x_idempotency_key, create_evm_smart_account_request)
Create a Smart Account

Creates a new Smart Account.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**x_idempotency_key** | Option<**String**> | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  |  |
**create_evm_smart_account_request** | Option<[**CreateEvmSmartAccountRequest**](CreateEvmSmartAccountRequest.md)> |  |  |

### Return type

[**models::EvmSmartAccount**](EvmSmartAccount.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## create_spend_permission

> models::EvmUserOperation create_spend_permission(x_wallet_auth, address, create_spend_permission_request, x_idempotency_key)
Create a spend permission

Creates a spend permission for the given smart account address.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**x_wallet_auth** | **String** | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [required] |
**address** | **String** | The address of the Smart Account to create the spend permission for. | [required] |
**create_spend_permission_request** | [**CreateSpendPermissionRequest**](CreateSpendPermissionRequest.md) |  | [required] |
**x_idempotency_key** | Option<**String**> | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  |  |

### Return type

[**models::EvmUserOperation**](EvmUserOperation.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## get_evm_smart_account

> models::EvmSmartAccount get_evm_smart_account(address)
Get a Smart Account by address

Gets a Smart Account by its address.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**address** | **String** | The 0x-prefixed address of the Smart Account. | [required] |

### Return type

[**models::EvmSmartAccount**](EvmSmartAccount.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## get_evm_smart_account_by_name

> models::EvmSmartAccount get_evm_smart_account_by_name(name)
Get a Smart Account by name

Gets a Smart Account by its name.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**name** | **String** | The name of the Smart Account. | [required] |

### Return type

[**models::EvmSmartAccount**](EvmSmartAccount.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## get_user_operation

> models::EvmUserOperation get_user_operation(address, user_op_hash)
Get a user operation

Gets a user operation by its hash.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**address** | **String** | The address of the Smart Account the user operation belongs to. | [required] |
**user_op_hash** | **String** | The hash of the user operation to fetch. | [required] |

### Return type

[**models::EvmUserOperation**](EvmUserOperation.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## list_evm_smart_accounts

> models::ListEvmSmartAccounts200Response list_evm_smart_accounts(page_size, page_token)
List Smart Accounts

Lists the Smart Accounts belonging to the developer's CDP Project. The response is paginated, and by default, returns 20 accounts per page.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**page_size** | Option<**i32**> | The number of accounts to return per page. |  |[default to 20]
**page_token** | Option<**String**> | The token for the next page of accounts, if any. |  |

### Return type

[**models::ListEvmSmartAccounts200Response**](listEvmSmartAccounts_200_response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## list_spend_permissions

> models::ListSpendPermissions200Response list_spend_permissions(address, page_size, page_token)
List spend permissions

Lists spend permission for the given smart account address.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**address** | **String** | The address of the Smart account to list spend permissions for. | [required] |
**page_size** | Option<**i32**> | The number of spend permissions to return per page. |  |[default to 20]
**page_token** | Option<**String**> | The token for the next page of spend permissions. Will be empty if there are no more spend permissions to fetch. |  |

### Return type

[**models::ListSpendPermissions200Response**](listSpendPermissions_200_response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## prepare_user_operation

> models::EvmUserOperation prepare_user_operation(address, prepare_user_operation_request)
Prepare a user operation

Prepares a new user operation on a Smart Account for a specific network.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**address** | **String** | The address of the Smart Account to create the user operation on. | [required] |
**prepare_user_operation_request** | Option<[**PrepareUserOperationRequest**](PrepareUserOperationRequest.md)> |  |  |

### Return type

[**models::EvmUserOperation**](EvmUserOperation.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## revoke_spend_permission

> models::EvmUserOperation revoke_spend_permission(x_wallet_auth, address, revoke_spend_permission_request, x_idempotency_key)
Revoke a spend permission

Revokes an existing spend permission.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**x_wallet_auth** | **String** | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [required] |
**address** | **String** | The address of the Smart account this spend permission is valid for. | [required] |
**revoke_spend_permission_request** | [**RevokeSpendPermissionRequest**](RevokeSpendPermissionRequest.md) |  | [required] |
**x_idempotency_key** | Option<**String**> | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  |  |

### Return type

[**models::EvmUserOperation**](EvmUserOperation.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## send_user_operation

> models::EvmUserOperation send_user_operation(address, user_op_hash, send_user_operation_request)
Send a user operation

Sends a user operation with a signature. The payload to sign must be the `userOpHash` field of the user operation. This hash should be signed directly (not using `personal_sign` or EIP-191 message hashing). The signature must be 65 bytes in length, consisting of: - 32 bytes for the `r` value - 32 bytes for the `s` value - 1 byte for the `v` value (must be 27 or 28) If using the CDP Paymaster, the user operation must be signed and sent within 2 minutes of being prepared.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**address** | **String** | The address of the Smart Account to send the user operation from. | [required] |
**user_op_hash** | **String** | The hash of the user operation to send. | [required] |
**send_user_operation_request** | Option<[**SendUserOperationRequest**](SendUserOperationRequest.md)> |  |  |

### Return type

[**models::EvmUserOperation**](EvmUserOperation.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## update_evm_smart_account

> models::EvmSmartAccount update_evm_smart_account(address, update_evm_smart_account_request)
Update an EVM Smart Account

Updates an existing EVM smart account. Use this to update the smart account's name.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**address** | **String** | The 0x-prefixed address of the EVM smart account. The address does not need to be checksummed. | [required] |
**update_evm_smart_account_request** | Option<[**UpdateEvmSmartAccountRequest**](UpdateEvmSmartAccountRequest.md)> |  |  |

### Return type

[**models::EvmSmartAccount**](EvmSmartAccount.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

