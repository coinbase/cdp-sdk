# \EvmTokenBalancesApi

All URIs are relative to *https://api.cdp.coinbase.com/platform*

Method | HTTP request | Description
------------- | ------------- | -------------
[**list_evm_token_balances**](EvmTokenBalancesApi.md#list_evm_token_balances) | **GET** /v2/evm/token-balances/{network}/{address} | List EVM token balances



## list_evm_token_balances

> models::ListEvmTokenBalances200Response list_evm_token_balances(address, network, page_size, page_token)
List EVM token balances

Lists the token balances of an EVM address on a given network. The balances include ERC-20 tokens and the native gas token (usually ETH). The response is paginated, and by default, returns 20 balances per page. **Note:** This endpoint is still under development and does not yet provide strong freshness guarantees. Specifically, balances of new tokens can, on occasion, take up to ~30 seconds to appear, while balances of tokens already belonging to an address will generally be close to chain tip. Freshness of new token balances will improve over the coming weeks.

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

