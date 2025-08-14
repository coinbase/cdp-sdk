# \SolanaAccountsApi

All URIs are relative to *https://api.cdp.coinbase.com/platform*

Method | HTTP request | Description
------------- | ------------- | -------------
[**create_solana_account**](SolanaAccountsApi.md#create_solana_account) | **POST** /v2/solana/accounts | Create a Solana account
[**export_solana_account**](SolanaAccountsApi.md#export_solana_account) | **POST** /v2/solana/accounts/{address}/export | Export an Solana account
[**export_solana_account_by_name**](SolanaAccountsApi.md#export_solana_account_by_name) | **POST** /v2/solana/accounts/export/by-name/{name} | Export a Solana account by name
[**get_solana_account**](SolanaAccountsApi.md#get_solana_account) | **GET** /v2/solana/accounts/{address} | Get a Solana account by address
[**get_solana_account_by_name**](SolanaAccountsApi.md#get_solana_account_by_name) | **GET** /v2/solana/accounts/by-name/{name} | Get a Solana account by name
[**import_solana_account**](SolanaAccountsApi.md#import_solana_account) | **POST** /v2/solana/accounts/import | Import a Solana account
[**list_solana_accounts**](SolanaAccountsApi.md#list_solana_accounts) | **GET** /v2/solana/accounts | List Solana accounts or get account by name
[**send_solana_transaction**](SolanaAccountsApi.md#send_solana_transaction) | **POST** /v2/solana/accounts/send/transaction | Send a Solana transaction
[**sign_solana_message**](SolanaAccountsApi.md#sign_solana_message) | **POST** /v2/solana/accounts/{address}/sign/message | Sign a message
[**sign_solana_transaction**](SolanaAccountsApi.md#sign_solana_transaction) | **POST** /v2/solana/accounts/{address}/sign/transaction | Sign a transaction
[**update_solana_account**](SolanaAccountsApi.md#update_solana_account) | **PUT** /v2/solana/accounts/{address} | Update a Solana account



## create_solana_account

> models::SolanaAccount create_solana_account(x_wallet_auth, x_idempotency_key, create_solana_account_request)
Create a Solana account

Creates a new Solana account.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**x_wallet_auth** | **String** | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [required] |
**x_idempotency_key** | Option<**String**> | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  |  |
**create_solana_account_request** | Option<[**CreateSolanaAccountRequest**](CreateSolanaAccountRequest.md)> |  |  |

### Return type

[**models::SolanaAccount**](SolanaAccount.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## export_solana_account

> models::ExportSolanaAccount200Response export_solana_account(x_wallet_auth, address, x_idempotency_key, export_evm_account_request)
Export an Solana account

Export an existing Solana account's private key. It is important to store the private key in a secure place after it's exported.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**x_wallet_auth** | **String** | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [required] |
**address** | **String** | The base58 encoded address of the Solana account. | [required] |
**x_idempotency_key** | Option<**String**> | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  |  |
**export_evm_account_request** | Option<[**ExportEvmAccountRequest**](ExportEvmAccountRequest.md)> |  |  |

### Return type

[**models::ExportSolanaAccount200Response**](exportSolanaAccount_200_response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## export_solana_account_by_name

> models::ExportSolanaAccount200Response export_solana_account_by_name(x_wallet_auth, name, x_idempotency_key, export_evm_account_request)
Export a Solana account by name

Export an existing Solana account's private key by its name. It is important to store the private key in a secure place after it's exported.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**x_wallet_auth** | **String** | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [required] |
**name** | **String** | The name of the Solana account. | [required] |
**x_idempotency_key** | Option<**String**> | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  |  |
**export_evm_account_request** | Option<[**ExportEvmAccountRequest**](ExportEvmAccountRequest.md)> |  |  |

### Return type

[**models::ExportSolanaAccount200Response**](exportSolanaAccount_200_response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## get_solana_account

> models::SolanaAccount get_solana_account(address)
Get a Solana account by address

Gets a Solana account by its address.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**address** | **String** | The base58 encoded address of the Solana account. | [required] |

### Return type

[**models::SolanaAccount**](SolanaAccount.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## get_solana_account_by_name

> models::SolanaAccount get_solana_account_by_name(name)
Get a Solana account by name

Gets a Solana account by its name.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**name** | **String** | The name of the Solana account. | [required] |

### Return type

[**models::SolanaAccount**](SolanaAccount.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## import_solana_account

> models::SolanaAccount import_solana_account(x_wallet_auth, x_idempotency_key, import_solana_account_request)
Import a Solana account

Import an existing Solana account into the developer's CDP Project. This API should be called from the [CDP SDK](https://github.com/coinbase/cdp-sdk) to ensure that the associated private key is properly encrypted.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**x_wallet_auth** | **String** | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [required] |
**x_idempotency_key** | Option<**String**> | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  |  |
**import_solana_account_request** | Option<[**ImportSolanaAccountRequest**](ImportSolanaAccountRequest.md)> |  |  |

### Return type

[**models::SolanaAccount**](SolanaAccount.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## list_solana_accounts

> models::ListSolanaAccounts200Response list_solana_accounts(page_size, page_token)
List Solana accounts or get account by name

Lists the Solana accounts belonging to the developer. The response is paginated, and by default, returns 20 accounts per page.  If a name is provided, the response will contain only the account with that name.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**page_size** | Option<**i32**> | The number of accounts to return per page. |  |[default to 20]
**page_token** | Option<**String**> | The token for the next page of accounts, if any. |  |

### Return type

[**models::ListSolanaAccounts200Response**](listSolanaAccounts_200_response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## send_solana_transaction

> models::SendSolanaTransaction200Response send_solana_transaction(x_wallet_auth, x_idempotency_key, send_solana_transaction_request)
Send a Solana transaction

Signs and sends a single Solana transaction using multiple Solana accounts. The transaction may contain contain several instructions, each of which may require signatures from different account keys.  The transaction should be serialized into a byte array and base64 encoded. The API handles recent blockhash management and fee estimation, leaving the developer to provide only the minimal set of fields necessary to send the transaction.  **Transaction types**  The following transaction types are supported: * [Legacy transactions](https://solana.com/developers/guides/advanced/versions#current-transaction-versions) * [Versioned transactions](https://solana.com/developers/guides/advanced/versions)  **Instruction Batching**  To batch multiple operations, include multiple instructions within a single transaction. All instructions within a transaction are executed atomically - if any instruction fails, the entire transaction fails and is rolled back.  **Network Support**  The following Solana networks are supported: * `solana` - Solana Mainnet * `solana-devnet` - Solana Devnet  The developer is responsible for ensuring that the unsigned transaction is valid, as the API will not validate the transaction.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**x_wallet_auth** | **String** | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [required] |
**x_idempotency_key** | Option<**String**> | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  |  |
**send_solana_transaction_request** | Option<[**SendSolanaTransactionRequest**](SendSolanaTransactionRequest.md)> |  |  |

### Return type

[**models::SendSolanaTransaction200Response**](sendSolanaTransaction_200_response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## sign_solana_message

> models::SignSolanaMessage200Response sign_solana_message(x_wallet_auth, address, x_idempotency_key, sign_solana_message_request)
Sign a message

Signs an arbitrary message with the given Solana account.  **WARNING:** Never sign a message that you didn't generate, as it can be an arbitrary transaction. For example, it might send all of your funds to an attacker.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**x_wallet_auth** | **String** | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [required] |
**address** | **String** | The base58 encoded address of the Solana account. | [required] |
**x_idempotency_key** | Option<**String**> | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  |  |
**sign_solana_message_request** | Option<[**SignSolanaMessageRequest**](SignSolanaMessageRequest.md)> |  |  |

### Return type

[**models::SignSolanaMessage200Response**](signSolanaMessage_200_response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## sign_solana_transaction

> models::SignSolanaTransaction200Response sign_solana_transaction(x_wallet_auth, address, x_idempotency_key, sign_solana_transaction_request)
Sign a transaction

Signs a transaction with the given Solana account. The unsigned transaction should be serialized into a byte array and then encoded as base64.  **Transaction types**  The following transaction types are supported: * [Legacy transactions](https://solana-labs.github.io/solana-web3.js/classes/Transaction.html) * [Versioned transactions](https://solana-labs.github.io/solana-web3.js/classes/VersionedTransaction.html)  The developer is responsible for ensuring that the unsigned transaction is valid, as the API will not validate the transaction.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**x_wallet_auth** | **String** | A JWT signed using your Wallet Secret, encoded in base64. Refer to the [Generate Wallet Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-wallet-token) section of our Authentication docs for more details on how to generate your Wallet Token.  | [required] |
**address** | **String** | The base58 encoded address of the Solana account. | [required] |
**x_idempotency_key** | Option<**String**> | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  |  |
**sign_solana_transaction_request** | Option<[**SignSolanaTransactionRequest**](SignSolanaTransactionRequest.md)> |  |  |

### Return type

[**models::SignSolanaTransaction200Response**](signSolanaTransaction_200_response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## update_solana_account

> models::SolanaAccount update_solana_account(address, x_idempotency_key, update_solana_account_request)
Update a Solana account

Updates an existing Solana account. Use this to update the account's name or account-level policy.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**address** | **String** | The base58 encoded address of the Solana account. | [required] |
**x_idempotency_key** | Option<**String**> | An optional [UUID v4](https://www.uuidgenerator.net/version4) request header for making requests safely retryable. When included, duplicate requests with the same key will return identical responses.  Refer to our [Idempotency docs](https://docs.cdp.coinbase.com/api-reference/v2/idempotency) for more information on using idempotency keys.  |  |
**update_solana_account_request** | Option<[**UpdateSolanaAccountRequest**](UpdateSolanaAccountRequest.md)> |  |  |

### Return type

[**models::SolanaAccount**](SolanaAccount.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

