# \OnchainDataApi

All URIs are relative to *https://api.cdp.coinbase.com/platform*

Method | HTTP request | Description
------------- | ------------- | -------------
[**list_data_token_balances**](OnchainDataApi.md#list_data_token_balances) | **GET** /v2/data/evm/token-balances/{network}/{address} | List EVM token balances
[**list_tokens_for_account**](OnchainDataApi.md#list_tokens_for_account) | **GET** /v2/data/evm/token-ownership/{network}/{address} | List token addresses for account
[**run_sql_query**](OnchainDataApi.md#run_sql_query) | **POST** /v2/data/query/run | Run SQL Query



## list_data_token_balances

> models::ListEvmTokenBalances200Response list_data_token_balances(address, network, page_size, page_token)
List EVM token balances

Lists the token balances of an EVM address on a given network. The balances include ERC-20 tokens and the native gas token (usually ETH). The response is paginated, and by default, returns 20 balances per page.  **Note:** This endpoint provides <1 second freshness from chain tip, <500ms response latency for wallets with reasonable token history, and 99.9% uptime for production use.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**address** | **String** | The 0x-prefixed EVM address to get balances for. The address does not need to be checksummed. | [required] |
**network** | [**ListEvmTokenBalancesNetwork**](.md) | The human-readable network name to get the balances for. | [required] |
**page_size** | Option<**i32**> | The number of balances to return per page. |  |[default to 20]
**page_token** | Option<**String**> | The token for the next page of balances. Will be empty if there are no more balances to fetch. |  |

### Return type

[**models::ListEvmTokenBalances200Response**](listEvmTokenBalances_200_response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## list_tokens_for_account

> models::AccountTokenAddressesResponse list_tokens_for_account(network, address)
List token addresses for account

Retrieve all ERC-20 token contract addresses that an account has ever received tokens from.  Analyzes transaction history to discover token interactions. 

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**network** | **String** | The blockchain network to query. | [required] |
**address** | **String** | The account address to analyze for token interactions. | [required] |

### Return type

[**models::AccountTokenAddressesResponse**](AccountTokenAddressesResponse.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## run_sql_query

> models::OnchainDataResult run_sql_query(onchain_data_query)
Run SQL Query

Run a read-only SQL query against indexed blockchain data including transactions, events, and decoded logs.  This endpoint provides direct SQL access to comprehensive blockchain data across supported networks. Queries are executed against optimized data structures for high-performance analytics.  ### Allowed Queries    - Standard SQL syntax (ClickHouse dialect)   - Read-only queries (SELECT statements)   - No DDL or DML operations   - No cartesian products  ### Supported Tables    - `base.events` - Base mainnet decoded event logs with parameters, event signature, topics, and more.   - `base.transactions` - Base mainnet transaction data including hash, block number, gas usage.   - `base.blocks` - Base mainnet block information.   - `base.encoded_logs` - Encoded log data of event logs that aren't able to be decoded by our event decoder (ex: log0 opcode).   - `base.transfers` - All event logs with event signature `Transfer(address,address,uint256)`. ERC-20, ERC-721, and ERC-1155 transfers are all included.  ### Query Limits    - Maximum result set: 10,000 rows   - Query timeout: 30 seconds   - Maximum JOINs: 5 

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**onchain_data_query** | [**OnchainDataQuery**](OnchainDataQuery.md) |  | [required] |

### Return type

[**models::OnchainDataResult**](OnchainDataResult.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

