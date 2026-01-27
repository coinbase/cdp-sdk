package com.coinbase.cdp.client.evm;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.auth.TokenProvider;
import com.coinbase.cdp.client.evm.EvmClientOptions.GetAccountOptions;
import com.coinbase.cdp.client.evm.EvmClientOptions.GetOrCreateAccountOptions;
import com.coinbase.cdp.client.evm.EvmClientOptions.GetSwapPriceOptions;
import com.coinbase.cdp.client.evm.EvmClientOptions.ListAccountsOptions;
import com.coinbase.cdp.client.evm.EvmClientOptions.ListSmartAccountsOptions;
import com.coinbase.cdp.client.evm.EvmClientOptions.ListTokenBalancesOptions;
import com.coinbase.cdp.openapi.ApiClient;
import com.coinbase.cdp.openapi.ApiException;
import com.coinbase.cdp.openapi.api.EvmAccountsApi;
import com.coinbase.cdp.openapi.api.EvmSmartAccountsApi;
import com.coinbase.cdp.openapi.api.EvmSwapsApi;
import com.coinbase.cdp.openapi.api.EvmTokenBalancesApi;
import com.coinbase.cdp.openapi.api.FaucetsApi;
import com.coinbase.cdp.openapi.model.CreateEvmAccountRequest;
import com.coinbase.cdp.openapi.model.CreateEvmSmartAccountRequest;
import com.coinbase.cdp.openapi.model.CreateEvmSwapQuoteRequest;
import com.coinbase.cdp.openapi.model.CreateSwapQuoteResponseWrapper;
import com.coinbase.cdp.openapi.model.EIP712Message;
import com.coinbase.cdp.openapi.model.EvmAccount;
import com.coinbase.cdp.openapi.model.EvmSmartAccount;
import com.coinbase.cdp.openapi.model.GetSwapPriceResponseWrapper;
import com.coinbase.cdp.openapi.model.ListEvmAccounts200Response;
import com.coinbase.cdp.openapi.model.ListEvmSmartAccounts200Response;
import com.coinbase.cdp.openapi.model.ListEvmTokenBalances200Response;
import com.coinbase.cdp.openapi.model.RequestEvmFaucet200Response;
import com.coinbase.cdp.openapi.model.RequestEvmFaucetRequest;
import com.coinbase.cdp.openapi.model.SendEvmTransaction200Response;
import com.coinbase.cdp.openapi.model.SendEvmTransactionRequest;
import com.coinbase.cdp.openapi.model.SignEvmHash200Response;
import com.coinbase.cdp.openapi.model.SignEvmHashRequest;
import com.coinbase.cdp.openapi.model.SignEvmMessage200Response;
import com.coinbase.cdp.openapi.model.SignEvmMessageRequest;
import com.coinbase.cdp.openapi.model.SignEvmTransaction200Response;
import com.coinbase.cdp.openapi.model.SignEvmTransactionRequest;
import com.coinbase.cdp.openapi.model.SignEvmTypedData200Response;
import com.coinbase.cdp.openapi.model.UpdateEvmAccountRequest;

/**
 * The namespace client for EVM operations.
 *
 * <p>Provides high-level methods for creating, managing, and using EVM accounts. Wallet JWT
 * generation is handled automatically for write operations when using the instance-based pattern.
 *
 * <p>Methods accept generated OpenAPI request types directly to reduce boilerplate.
 *
 * <p>Usage patterns:
 *
 * <pre>{@code
 * // Pattern 1: Instance-based (automatic token generation)
 * try (CdpClient cdp = CdpClient.create()) {
 *     EvmAccount account = cdp.evm().createAccount(
 *         new CreateEvmAccountRequest().name("my-account")
 *     );
 *
 *     // Sign a message
 *     var signature = cdp.evm().signMessage(
 *         account.getAddress(),
 *         new SignEvmMessageRequest().message("Hello, World!")
 *     );
 * }
 *
 * // Pattern 2: Static factory with pre-generated tokens
 * CdpTokenResponse tokens = tokenGenerator.generateTokens(request);
 * EvmAccount account = CdpClient.evm(tokens).createAccount(
 *     new CreateEvmAccountRequest().name("my-account")
 * );
 * }</pre>
 */
public class EvmClient {

  private final CdpClient cdpClient;
  private final TokenProvider tokenProvider;
  private final EvmAccountsApi accountsApi;
  private final EvmSmartAccountsApi smartAccountsApi;
  private final EvmSwapsApi swapsApi;
  private final EvmTokenBalancesApi tokenBalancesApi;
  private final FaucetsApi faucetsApi;

  /**
   * Creates a new EVM client for instance-based usage.
   *
   * @param cdpClient the parent CDP client
   */
  public EvmClient(CdpClient cdpClient) {
    this.cdpClient = cdpClient;
    this.tokenProvider = null;
    ApiClient apiClient = cdpClient.getApiClient();
    this.accountsApi = new EvmAccountsApi(apiClient);
    this.smartAccountsApi = new EvmSmartAccountsApi(apiClient);
    this.swapsApi = new EvmSwapsApi(apiClient);
    this.tokenBalancesApi = new EvmTokenBalancesApi(apiClient);
    this.faucetsApi = new FaucetsApi(apiClient);
  }

  /**
   * Creates a new EVM client for static factory usage with pre-generated tokens.
   *
   * @param apiClient the pre-configured API client with tokens
   * @param tokenProvider the token provider containing pre-generated tokens
   */
  public EvmClient(ApiClient apiClient, TokenProvider tokenProvider) {
    this.cdpClient = null;
    this.tokenProvider = tokenProvider;
    this.accountsApi = new EvmAccountsApi(apiClient);
    this.smartAccountsApi = new EvmSmartAccountsApi(apiClient);
    this.swapsApi = new EvmSwapsApi(apiClient);
    this.tokenBalancesApi = new EvmTokenBalancesApi(apiClient);
    this.faucetsApi = new FaucetsApi(apiClient);
  }

  // ==================== Server Accounts ====================

  /**
   * Creates a new EVM account with default options.
   *
   * @return the created account
   * @throws ApiException if the API call fails
   */
  public EvmAccount createAccount() throws ApiException {
    return createAccount(new CreateEvmAccountRequest());
  }

  /**
   * Creates a new EVM account.
   *
   * @param request the account creation request
   * @return the created account
   * @throws ApiException if the API call fails
   */
  public EvmAccount createAccount(CreateEvmAccountRequest request) throws ApiException {
    return createAccount(request, null);
  }

  /**
   * Creates a new EVM account with idempotency key.
   *
   * @param request the account creation request
   * @param idempotencyKey optional idempotency key
   * @return the created account
   * @throws ApiException if the API call fails
   */
  public EvmAccount createAccount(CreateEvmAccountRequest request, String idempotencyKey)
      throws ApiException {
    String walletJwt = generateWalletJwt("POST", "/v2/evm/accounts", request);
    return accountsApi.createEvmAccount(walletJwt, idempotencyKey, request);
  }

  /**
   * Gets an EVM account by address or name.
   *
   * @param options the get options (must include address or name)
   * @return the account
   * @throws ApiException if the API call fails
   * @throws IllegalArgumentException if neither address nor name is provided
   */
  public EvmAccount getAccount(GetAccountOptions options) throws ApiException {
    if (options.address() != null) {
      return accountsApi.getEvmAccount(options.address());
    }
    if (options.name() != null) {
      return accountsApi.getEvmAccountByName(options.name());
    }
    throw new IllegalArgumentException("Either address or name must be provided");
  }

  /**
   * Gets an EVM account, or creates one if it doesn't exist.
   *
   * @param options the options (must include name)
   * @return the account
   * @throws ApiException if the API call fails
   */
  public EvmAccount getOrCreateAccount(GetOrCreateAccountOptions options) throws ApiException {
    try {
      return accountsApi.getEvmAccountByName(options.name());
    } catch (ApiException e) {
      if (e.getCode() == 404) {
        try {
          return createAccount(
              new CreateEvmAccountRequest()
                  .name(options.name())
                  .accountPolicy(options.accountPolicy()));
        } catch (ApiException createError) {
          if (createError.getCode() == 409) {
            return accountsApi.getEvmAccountByName(options.name());
          }
          throw createError;
        }
      }
      throw e;
    }
  }

  /**
   * Lists EVM accounts.
   *
   * @return the list response
   * @throws ApiException if the API call fails
   */
  public ListEvmAccounts200Response listAccounts() throws ApiException {
    return listAccounts(ListAccountsOptions.builder().build());
  }

  /**
   * Lists EVM accounts with pagination.
   *
   * @param options the list options
   * @return the list response
   * @throws ApiException if the API call fails
   */
  public ListEvmAccounts200Response listAccounts(ListAccountsOptions options) throws ApiException {
    return accountsApi.listEvmAccounts(options.pageSize(), options.pageToken());
  }

  /**
   * Updates an EVM account.
   *
   * @param address the account address
   * @param request the update request
   * @return the updated account
   * @throws ApiException if the API call fails
   */
  public EvmAccount updateAccount(String address, UpdateEvmAccountRequest request)
      throws ApiException {
    return updateAccount(address, request, null);
  }

  /**
   * Updates an EVM account with idempotency key.
   *
   * @param address the account address
   * @param request the update request
   * @param idempotencyKey optional idempotency key
   * @return the updated account
   * @throws ApiException if the API call fails
   */
  public EvmAccount updateAccount(
      String address, UpdateEvmAccountRequest request, String idempotencyKey) throws ApiException {
    return accountsApi.updateEvmAccount(address, idempotencyKey, request);
  }

  // ==================== Signing Operations ====================

  /**
   * Signs a hash with the specified EVM account.
   *
   * @param address the account address
   * @param request the sign request
   * @return the signature response
   * @throws ApiException if the API call fails
   */
  public SignEvmHash200Response signHash(String address, SignEvmHashRequest request)
      throws ApiException {
    return signHash(address, request, null);
  }

  /**
   * Signs a hash with the specified EVM account and idempotency key.
   *
   * @param address the account address
   * @param request the sign request
   * @param idempotencyKey optional idempotency key
   * @return the signature response
   * @throws ApiException if the API call fails
   */
  public SignEvmHash200Response signHash(
      String address, SignEvmHashRequest request, String idempotencyKey) throws ApiException {
    String walletJwt =
        generateWalletJwt("POST", "/v2/evm/accounts/" + address + "/sign/hash", request);
    return accountsApi.signEvmHash(address, walletJwt, idempotencyKey, request);
  }

  /**
   * Signs a message with the specified EVM account.
   *
   * @param address the account address
   * @param request the sign request
   * @return the signature response
   * @throws ApiException if the API call fails
   */
  public SignEvmMessage200Response signMessage(String address, SignEvmMessageRequest request)
      throws ApiException {
    return signMessage(address, request, null);
  }

  /**
   * Signs a message with the specified EVM account and idempotency key.
   *
   * @param address the account address
   * @param request the sign request
   * @param idempotencyKey optional idempotency key
   * @return the signature response
   * @throws ApiException if the API call fails
   */
  public SignEvmMessage200Response signMessage(
      String address, SignEvmMessageRequest request, String idempotencyKey) throws ApiException {
    String walletJwt =
        generateWalletJwt("POST", "/v2/evm/accounts/" + address + "/sign/message", request);
    return accountsApi.signEvmMessage(address, walletJwt, idempotencyKey, request);
  }

  /**
   * Signs a transaction with the specified EVM account.
   *
   * @param address the account address
   * @param request the sign request
   * @return the signature response
   * @throws ApiException if the API call fails
   */
  public SignEvmTransaction200Response signTransaction(
      String address, SignEvmTransactionRequest request) throws ApiException {
    return signTransaction(address, request, null);
  }

  /**
   * Signs a transaction with the specified EVM account and idempotency key.
   *
   * @param address the account address
   * @param request the sign request
   * @param idempotencyKey optional idempotency key
   * @return the signature response
   * @throws ApiException if the API call fails
   */
  public SignEvmTransaction200Response signTransaction(
      String address, SignEvmTransactionRequest request, String idempotencyKey)
      throws ApiException {
    String walletJwt =
        generateWalletJwt("POST", "/v2/evm/accounts/" + address + "/sign/transaction", request);
    return accountsApi.signEvmTransaction(address, walletJwt, idempotencyKey, request);
  }

  /**
   * Signs EIP-712 typed data with the specified EVM account.
   *
   * @param address the account address
   * @param typedData the EIP-712 typed data to sign
   * @return the signature response
   * @throws ApiException if the API call fails
   */
  public SignEvmTypedData200Response signTypedData(String address, EIP712Message typedData)
      throws ApiException {
    return signTypedData(address, typedData, null);
  }

  /**
   * Signs EIP-712 typed data with the specified EVM account and idempotency key.
   *
   * @param address the account address
   * @param typedData the EIP-712 typed data to sign
   * @param idempotencyKey optional idempotency key
   * @return the signature response
   * @throws ApiException if the API call fails
   */
  public SignEvmTypedData200Response signTypedData(
      String address, EIP712Message typedData, String idempotencyKey) throws ApiException {
    String walletJwt =
        generateWalletJwt("POST", "/v2/evm/accounts/" + address + "/sign/typed-data", typedData);
    return accountsApi.signEvmTypedData(address, walletJwt, idempotencyKey, typedData);
  }

  // ==================== Transactions ====================

  /**
   * Sends a transaction from the specified EVM account.
   *
   * @param address the account address
   * @param request the transaction request
   * @return the transaction response
   * @throws ApiException if the API call fails
   */
  public SendEvmTransaction200Response sendTransaction(
      String address, SendEvmTransactionRequest request) throws ApiException {
    return sendTransaction(address, request, null);
  }

  /**
   * Sends a transaction from the specified EVM account with idempotency key.
   *
   * @param address the account address
   * @param request the transaction request
   * @param idempotencyKey optional idempotency key
   * @return the transaction response
   * @throws ApiException if the API call fails
   */
  public SendEvmTransaction200Response sendTransaction(
      String address, SendEvmTransactionRequest request, String idempotencyKey)
      throws ApiException {
    String walletJwt =
        generateWalletJwt("POST", "/v2/evm/accounts/" + address + "/send/transaction", request);
    return accountsApi.sendEvmTransaction(address, walletJwt, idempotencyKey, request);
  }

  // ==================== Smart Accounts ====================

  /**
   * Creates a new EVM smart account.
   *
   * @param request the smart account creation request
   * @return the created smart account
   * @throws ApiException if the API call fails
   */
  public EvmSmartAccount createSmartAccount(CreateEvmSmartAccountRequest request)
      throws ApiException {
    return createSmartAccount(request, null);
  }

  /**
   * Creates a new EVM smart account with idempotency key.
   *
   * @param request the smart account creation request
   * @param idempotencyKey optional idempotency key
   * @return the created smart account
   * @throws ApiException if the API call fails
   */
  public EvmSmartAccount createSmartAccount(
      CreateEvmSmartAccountRequest request, String idempotencyKey) throws ApiException {
    return smartAccountsApi.createEvmSmartAccount(idempotencyKey, request);
  }

  /**
   * Lists EVM smart accounts.
   *
   * @return the list response
   * @throws ApiException if the API call fails
   */
  public ListEvmSmartAccounts200Response listSmartAccounts() throws ApiException {
    return listSmartAccounts(ListSmartAccountsOptions.builder().build());
  }

  /**
   * Lists EVM smart accounts with pagination.
   *
   * @param options the list options
   * @return the list response
   * @throws ApiException if the API call fails
   */
  public ListEvmSmartAccounts200Response listSmartAccounts(ListSmartAccountsOptions options)
      throws ApiException {
    return smartAccountsApi.listEvmSmartAccounts(options.pageSize(), options.pageToken());
  }

  // ==================== Token Balances ====================

  /**
   * Lists token balances for an address.
   *
   * @param options the options
   * @return the token balances
   * @throws ApiException if the API call fails
   */
  public ListEvmTokenBalances200Response listTokenBalances(ListTokenBalancesOptions options)
      throws ApiException {
    return tokenBalancesApi.listEvmTokenBalances(
        options.address(), options.network(), options.pageSize(), options.pageToken());
  }

  // ==================== Faucet ====================

  /**
   * Requests funds from an EVM faucet.
   *
   * @param request the faucet request
   * @return the faucet response
   * @throws ApiException if the API call fails
   */
  public RequestEvmFaucet200Response requestFaucet(RequestEvmFaucetRequest request)
      throws ApiException {
    return faucetsApi.requestEvmFaucet(request);
  }

  // ==================== Swaps ====================

  /**
   * Gets a swap price.
   *
   * @param options the swap price options (GET request with query params)
   * @return the swap price response
   * @throws ApiException if the API call fails
   */
  public GetSwapPriceResponseWrapper getSwapPrice(GetSwapPriceOptions options) throws ApiException {
    return swapsApi.getEvmSwapPrice(
        options.network(),
        options.toToken(),
        options.fromToken(),
        options.fromAmount(),
        options.taker(),
        options.signerAddress(),
        options.gasPrice(),
        options.slippageBps());
  }

  /**
   * Creates a swap quote.
   *
   * @param request the swap quote request
   * @return the swap quote response
   * @throws ApiException if the API call fails
   */
  public CreateSwapQuoteResponseWrapper createSwapQuote(CreateEvmSwapQuoteRequest request)
      throws ApiException {
    return createSwapQuote(request, null);
  }

  /**
   * Creates a swap quote with idempotency key.
   *
   * @param request the swap quote request
   * @param idempotencyKey optional idempotency key
   * @return the swap quote response
   * @throws ApiException if the API call fails
   */
  public CreateSwapQuoteResponseWrapper createSwapQuote(
      CreateEvmSwapQuoteRequest request, String idempotencyKey) throws ApiException {
    return swapsApi.createEvmSwapQuote(request, idempotencyKey);
  }

  // ==================== Internal Helpers ====================

  private String generateWalletJwt(String method, String path, Object requestBody) {
    if (cdpClient != null) {
      return cdpClient.generateWalletJwt(method, path, requestBody);
    }
    // Use pre-generated wallet JWT from TokenProvider for static factory pattern
    if (tokenProvider != null) {
      return tokenProvider.walletAuthToken().orElse(null);
    }
    return null;
  }
}
