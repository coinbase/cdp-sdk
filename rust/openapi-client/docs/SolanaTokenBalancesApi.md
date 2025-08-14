# \SolanaTokenBalancesApi

All URIs are relative to *https://api.cdp.coinbase.com/platform*

Method | HTTP request | Description
------------- | ------------- | -------------
[**list_solana_token_balances**](SolanaTokenBalancesApi.md#list_solana_token_balances) | **GET** /v2/solana/token-balances/{network}/{address} | List Solana token balances



## list_solana_token_balances

> models::ListSolanaTokenBalances200Response list_solana_token_balances(address, network, page_size, page_token)
List Solana token balances

Lists the token balances of a Solana address on a given network. The balances include SPL tokens and the native SOL token. The response is paginated, and by default, returns 20 balances per page.  **Note:** This endpoint is still under development and does not yet provide strong availability or freshness guarantees. Freshness and availability of new token balances will improve over the coming weeks.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**address** | **String** | The base58 encoded Solana address to get balances for. | [required] |
**network** | [**ListSolanaTokenBalancesNetwork**](.md) | The human-readable network name to get the balances for. | [required] |
**page_size** | Option<**i32**> | The number of balances to return per page. |  |[default to 20]
**page_token** | Option<**String**> | The token for the next page of balances. Will be empty if there are no more balances to fetch. |  |

### Return type

[**models::ListSolanaTokenBalances200Response**](listSolanaTokenBalances_200_response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

