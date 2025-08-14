# \EvmAccountsApi

All URIs are relative to *https://api.cdp.coinbase.com/platform*

Method | HTTP request | Description
------------- | ------------- | -------------
[**create_evm_account**](EvmAccountsApi.md#create_evm_account) | **POST** /v2/evm/accounts | Create an EVM account
[**export_evm_account**](EvmAccountsApi.md#export_evm_account) | **POST** /v2/evm/accounts/{address}/export | Export an EVM account
[**export_evm_account_by_name**](EvmAccountsApi.md#export_evm_account_by_name) | **POST** /v2/evm/accounts/export/by-name/{name} | Export an EVM account by name
[**get_evm_account**](EvmAccountsApi.md#get_evm_account) | **GET** /v2/evm/accounts/{address} | Get an EVM account by address
[**get_evm_account_by_name**](EvmAccountsApi.md#get_evm_account_by_name) | **GET** /v2/evm/accounts/by-name/{name} | Get an EVM account by name
[**import_evm_account**](EvmAccountsApi.md#import_evm_account) | **POST** /v2/evm/accounts/import | Import an EVM account
[**list_evm_accounts**](EvmAccountsApi.md#list_evm_accounts) | **GET** /v2/evm/accounts | List EVM accounts
[**send_evm_transaction**](EvmAccountsApi.md#send_evm_transaction) | **POST** /v2/evm/accounts/{address}/send/transaction | Send a transaction
[**sign_evm_hash**](EvmAccountsApi.md#sign_evm_hash) | **POST** /v2/evm/accounts/{address}/sign | Sign a hash
[**sign_evm_message**](EvmAccountsApi.md#sign_evm_message) | **POST** /v2/evm/accounts/{address}/sign/message | Sign an EIP-191 message
[**sign_evm_transaction**](EvmAccountsApi.md#sign_evm_transaction) | **POST** /v2/evm/accounts/{address}/sign/transaction | Sign a transaction
[**sign_evm_typed_data**](EvmAccountsApi.md#sign_evm_typed_data) | **POST** /v2/evm/accounts/{address}/sign/typed-data | Sign EIP-712 typed data
[**update_evm_account**](EvmAccountsApi.md#update_evm_account) | **PUT** /v2/evm/accounts/{address} | Update an EVM account



## create_evm_account

> models::EvmAccount create_evm_account(x_wallet_auth, x_idempotency_key, create_evm_account_request)
Create an EVM account

Creates a new EVM account.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**x_wallet_auth** | **String** | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [required] |
**x_idempotency_key** | Option<**String**> | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  |  |
**create_evm_account_request** | Option<[**CreateEvmAccountRequest**](CreateEvmAccountRequest.md)> |  |  |

### Return type

[**models::EvmAccount**](EvmAccount.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## export_evm_account

> models::ExportEvmAccount200Response export_evm_account(x_wallet_auth, address, x_idempotency_key, export_evm_account_request)
Export an EVM account

Export an existing EVM account's private key. It is important to store the private key in a secure place after it's exported.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**x_wallet_auth** | **String** | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [required] |
**address** | **String** | The 0x-prefixed address of the EVM account. The address does not need to be checksummed. | [required] |
**x_idempotency_key** | Option<**String**> | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  |  |
**export_evm_account_request** | Option<[**ExportEvmAccountRequest**](ExportEvmAccountRequest.md)> |  |  |

### Return type

[**models::ExportEvmAccount200Response**](exportEvmAccount_200_response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## export_evm_account_by_name

> models::ExportEvmAccount200Response export_evm_account_by_name(x_wallet_auth, name, x_idempotency_key, export_evm_account_request)
Export an EVM account by name

Export an existing EVM account's private key by its name. It is important to store the private key in a secure place after it's exported.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**x_wallet_auth** | **String** | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [required] |
**name** | **String** | The name of the EVM account. | [required] |
**x_idempotency_key** | Option<**String**> | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  |  |
**export_evm_account_request** | Option<[**ExportEvmAccountRequest**](ExportEvmAccountRequest.md)> |  |  |

### Return type

[**models::ExportEvmAccount200Response**](exportEvmAccount_200_response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## get_evm_account

> models::EvmAccount get_evm_account(address)
Get an EVM account by address

Gets an EVM account by its address.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**address** | **String** | The 0x-prefixed address of the EVM account. The address does not need to be checksummed. | [required] |

### Return type

[**models::EvmAccount**](EvmAccount.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## get_evm_account_by_name

> models::EvmAccount get_evm_account_by_name(name)
Get an EVM account by name

Gets an EVM account by its name.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**name** | **String** | The name of the EVM account. | [required] |

### Return type

[**models::EvmAccount**](EvmAccount.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## import_evm_account

> models::EvmAccount import_evm_account(x_wallet_auth, x_idempotency_key, import_evm_account_request)
Import an EVM account

Import an existing EVM account into the developer's CDP Project. This API should be called from the [CDP SDK](https://github.com/coinbase/cdp-sdk) to ensure that the associated private key is properly encrypted.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**x_wallet_auth** | **String** | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [required] |
**x_idempotency_key** | Option<**String**> | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  |  |
**import_evm_account_request** | Option<[**ImportEvmAccountRequest**](ImportEvmAccountRequest.md)> |  |  |

### Return type

[**models::EvmAccount**](EvmAccount.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## list_evm_accounts

> models::ListEvmAccounts200Response list_evm_accounts(page_size, page_token)
List EVM accounts

Lists the EVM accounts belonging to the developer's CDP Project. The response is paginated, and by default, returns 20 accounts per page.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**page_size** | Option<**i32**> | The number of accounts to return per page. |  |[default to 20]
**page_token** | Option<**String**> | The token for the next page of accounts, if any. |  |

### Return type

[**models::ListEvmAccounts200Response**](listEvmAccounts_200_response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## send_evm_transaction

> models::SendEvmTransaction200Response send_evm_transaction(x_wallet_auth, address, x_idempotency_key, send_evm_transaction_request)
Send a transaction

Signs a transaction with the given EVM account and sends it to the indicated supported network. This API handles nonce management and gas estimation, leaving the developer to provide only the minimal set of fields necessary to send the transaction. The transaction should be serialized as a hex string using [RLP](https://ethereum.org/en/developers/docs/data-structures-and-encoding/rlp/).  The transaction must be an [EIP-1559 dynamic fee transaction](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1559.md).   **Transaction fields and API behavior**  - `to` *(Required)*: The address of the contract or account to send the transaction to. - `chainId` *(Ignored)*: The value of the `chainId` field in the transaction is ignored.   The transaction will be sent to the network indicated by the `network` field in the request body.  - `nonce` *(Optional)*: The nonce to use for the transaction. If not provided, the API will assign    a nonce to the transaction based on the current state of the account.  - `maxPriorityFeePerGas` *(Optional)*: The maximum priority fee per gas to use for the transaction.    If not provided, the API will estimate a value based on current network conditions.  - `maxFeePerGas` *(Optional)*: The maximum fee per gas to use for the transaction.    If not provided, the API will estimate a value based on current network conditions.  - `gasLimit` *(Optional)*: The gas limit to use for the transaction. If not provided, the API will estimate a value   based on the `to` and `data` fields of the transaction.  - `value` *(Optional)*: The amount of ETH, in wei, to send with the transaction. - `data` *(Optional)*: The data to send with the transaction; only used for contract calls. - `accessList` *(Optional)*: The access list to use for the transaction.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**x_wallet_auth** | **String** | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [required] |
**address** | **String** | The 0x-prefixed address of the Ethereum account. | [required] |
**x_idempotency_key** | Option<**String**> | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  |  |
**send_evm_transaction_request** | Option<[**SendEvmTransactionRequest**](SendEvmTransactionRequest.md)> |  |  |

### Return type

[**models::SendEvmTransaction200Response**](sendEvmTransaction_200_response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## sign_evm_hash

> models::SignEvmHash200Response sign_evm_hash(x_wallet_auth, address, x_idempotency_key, sign_evm_hash_request)
Sign a hash

Signs an arbitrary 32 byte hash with the given EVM account.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**x_wallet_auth** | **String** | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [required] |
**address** | **String** | The 0x-prefixed address of the EVM account. | [required] |
**x_idempotency_key** | Option<**String**> | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  |  |
**sign_evm_hash_request** | Option<[**SignEvmHashRequest**](SignEvmHashRequest.md)> |  |  |

### Return type

[**models::SignEvmHash200Response**](signEvmHash_200_response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## sign_evm_message

> models::SignEvmMessage200Response sign_evm_message(x_wallet_auth, address, x_idempotency_key, sign_evm_message_request)
Sign an EIP-191 message

Signs an [EIP-191](https://eips.ethereum.org/EIPS/eip-191) message with the given EVM account.  Per the specification, the message in the request body is prepended with `0x19 <0x45 (E)> <thereum Signed Message:\\n\" + len(message)>` before being signed.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**x_wallet_auth** | **String** | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [required] |
**address** | **String** | The 0x-prefixed address of the EVM account. | [required] |
**x_idempotency_key** | Option<**String**> | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  |  |
**sign_evm_message_request** | Option<[**SignEvmMessageRequest**](SignEvmMessageRequest.md)> |  |  |

### Return type

[**models::SignEvmMessage200Response**](signEvmMessage_200_response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## sign_evm_transaction

> models::SignEvmTransaction200Response sign_evm_transaction(x_wallet_auth, address, x_idempotency_key, sign_evm_transaction_request)
Sign a transaction

Signs a transaction with the given EVM account. The transaction should be serialized as a hex string using [RLP](https://ethereum.org/en/developers/docs/data-structures-and-encoding/rlp/).  The transaction must be an [EIP-1559 dynamic fee transaction](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1559.md). The developer is responsible for ensuring that the unsigned transaction is valid, as the API will not validate the transaction.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**x_wallet_auth** | **String** | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [required] |
**address** | **String** | The 0x-prefixed address of the EVM account. | [required] |
**x_idempotency_key** | Option<**String**> | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  |  |
**sign_evm_transaction_request** | Option<[**SignEvmTransactionRequest**](SignEvmTransactionRequest.md)> |  |  |

### Return type

[**models::SignEvmTransaction200Response**](signEvmTransaction_200_response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## sign_evm_typed_data

> models::SignEvmTypedData200Response sign_evm_typed_data(x_wallet_auth, address, x_idempotency_key, eip712_message)
Sign EIP-712 typed data

Signs [EIP-712](https://eips.ethereum.org/EIPS/eip-712) typed data with the given EVM account.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**x_wallet_auth** | **String** | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [required] |
**address** | **String** | The 0x-prefixed address of the EVM account. | [required] |
**x_idempotency_key** | Option<**String**> | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  |  |
**eip712_message** | Option<[**Eip712Message**](Eip712Message.md)> |  |  |

### Return type

[**models::SignEvmTypedData200Response**](signEvmTypedData_200_response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## update_evm_account

> models::EvmAccount update_evm_account(address, x_idempotency_key, update_evm_account_request)
Update an EVM account

Updates an existing EVM account. Use this to update the account's name or account-level policy.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**address** | **String** | The 0x-prefixed address of the EVM account. The address does not need to be checksummed. | [required] |
**x_idempotency_key** | Option<**String**> | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  |  |
**update_evm_account_request** | Option<[**UpdateEvmAccountRequest**](UpdateEvmAccountRequest.md)> |  |  |

### Return type

[**models::EvmAccount**](EvmAccount.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

