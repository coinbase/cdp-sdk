# \FaucetsApi

All URIs are relative to *https://api.cdp.coinbase.com/platform*

Method | HTTP request | Description
------------- | ------------- | -------------
[**request_evm_faucet**](FaucetsApi.md#request_evm_faucet) | **POST** /v2/evm/faucet | Request funds on EVM test networks
[**request_solana_faucet**](FaucetsApi.md#request_solana_faucet) | **POST** /v2/solana/faucet | Request funds on Solana devnet



## request_evm_faucet

> models::RequestEvmFaucet200Response request_evm_faucet(request_evm_faucet_request)
Request funds on EVM test networks

Request funds from the CDP Faucet on supported EVM test networks.  Faucets are available for ETH, USDC, EURC, and cbBTC on Base Sepolia and Ethereum Sepolia, and for ETH only on Ethereum Hoodi.  To prevent abuse, we enforce rate limits within a rolling 24-hour window to control the amount of funds that can be requested. These limits are applied at both the CDP User level and the blockchain address level. A single blockchain address cannot exceed the specified limits, even if multiple users submit requests to the same address.  | Token | Amount per Faucet Request |Rolling 24-hour window Rate Limits| |:-----:|:-------------------------:|:--------------------------------:| | ETH   | 0.0001 ETH                | 0.1 ETH                          | | USDC  | 1 USDC                    | 10 USDC                          | | EURC  | 1 EURC                    | 10 EURC                          | | cbBTC | 0.0001 cbBTC              | 0.001 cbBTC                      | 

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**request_evm_faucet_request** | Option<[**RequestEvmFaucetRequest**](RequestEvmFaucetRequest.md)> |  |  |

### Return type

[**models::RequestEvmFaucet200Response**](requestEvmFaucet_200_response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## request_solana_faucet

> models::RequestSolanaFaucet200Response request_solana_faucet(request_solana_faucet_request)
Request funds on Solana devnet

Request funds from the CDP Faucet on Solana devnet.  Faucets are available for SOL.  To prevent abuse, we enforce rate limits within a rolling 24-hour window to control the amount of funds that can be requested. These limits are applied at both the CDP User level and the blockchain address level. A single blockchain address cannot exceed the specified limits, even if multiple users submit requests to the same address.  | Token | Amount per Faucet Request |Rolling 24-hour window Rate Limits| |:-----:|:-------------------------:|:--------------------------------:| | SOL   | 0.00125 SOL               | 0.0125 SOL                       | | USDC  | 1 USDC                    | 10 USDC                          | 

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**request_solana_faucet_request** | Option<[**RequestSolanaFaucetRequest**](RequestSolanaFaucetRequest.md)> |  |  |

### Return type

[**models::RequestSolanaFaucet200Response**](requestSolanaFaucet_200_response.md)

### Authorization

[apiKeyAuth](../README.md#apiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

