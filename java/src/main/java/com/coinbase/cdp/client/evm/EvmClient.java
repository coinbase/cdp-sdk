package com.coinbase.cdp.client.evm;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.auth.TokenProvider;
import com.coinbase.cdp.client.evm.EvmClientOptions.GetAccountOptions;
import com.coinbase.cdp.client.evm.EvmClientOptions.GetOrCreateAccountOptions;
import com.coinbase.cdp.client.evm.EvmClientOptions.GetSwapPriceOptions;
import com.coinbase.cdp.client.evm.EvmClientOptions.ListAccountsOptions;
import com.coinbase.cdp.client.evm.EvmClientOptions.ListSmartAccountsOptions;
import com.coinbase.cdp.client.evm.EvmClientOptions.ListSpendPermissionsOptions;
import com.coinbase.cdp.client.evm.EvmClientOptions.ListTokenBalancesOptions;
import com.coinbase.cdp.client.evm.EvmClientOptions.TransferOptions;
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
import com.coinbase.cdp.openapi.model.CreateSpendPermissionRequest;
import com.coinbase.cdp.openapi.model.CreateSwapQuoteResponseWrapper;
import com.coinbase.cdp.openapi.model.EIP712Message;
import com.coinbase.cdp.openapi.model.EvmAccount;
import com.coinbase.cdp.openapi.model.EvmSmartAccount;
import com.coinbase.cdp.openapi.model.EvmUserOperation;
import com.coinbase.cdp.openapi.model.GetSwapPriceResponseWrapper;
import com.coinbase.cdp.openapi.model.ListEvmAccounts200Response;
import com.coinbase.cdp.openapi.model.ListEvmSmartAccounts200Response;
import com.coinbase.cdp.openapi.model.ListEvmTokenBalances200Response;
import com.coinbase.cdp.openapi.model.ListSpendPermissions200Response;
import com.coinbase.cdp.openapi.model.RequestEvmFaucet200Response;
import com.coinbase.cdp.openapi.model.RequestEvmFaucetRequest;
import com.coinbase.cdp.openapi.model.RevokeSpendPermissionRequest;
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
import com.coinbase.cdp.utils.TokenAddressResolver;
import com.coinbase.cdp.utils.TransactionBuilder;

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
 * // Pattern 1: From environment variables
 * try (CdpClient cdp = CdpClient.create()) {
 *     EvmAccount account = cdp.evm().createAccount(
 *         new CreateEvmAccountRequest().name("my-account")
 *     );
 * }
 *
 * // Pattern 2: With credentials
 * try (CdpClient cdp = CdpClient.builder()
 *         .credentials("api-key-id", "api-key-secret")
 *         .walletSecret("wallet-secret")
 *         .build()) {
 *     EvmAccount account = cdp.evm().createAccount(
 *         new CreateEvmAccountRequest().name("my-account")
 *     );
 * }
 *
 * // Pattern 3: With pre-generated TokenProvider
 * try (CdpClient cdp = CdpClient.builder()
 *         .tokenProvider(myTokenProvider)
 *         .build()) {
 *     EvmAccount account = cdp.evm().createAccount(
 *         new CreateEvmAccountRequest().name("my-account")
 *     );
 * }
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

  // ==================== Transfers ====================

  /**
   * Transfers tokens from the specified account.
   *
   * <p>Supports native ETH transfers and ERC20 token transfers.
   *
   * <p>Example usage:
   *
   * <pre>{@code
   * // Transfer native ETH
   * var result = evmClient.transfer(
   *     account.getAddress(),
   *     TransferOptions.builder()
   *         .to("0x742d35Cc6634C0532925a3b844Bc9e7595f3ABCD")
   *         .amount(new BigInteger("1000000000000000")) // 0.001 ETH in wei
   *         .token("eth")
   *         .network(NetworkEnum.BASE_SEPOLIA)
   *         .build()
   * );
   *
   * // Transfer USDC
   * var result = evmClient.transfer(
   *     account.getAddress(),
   *     TransferOptions.builder()
   *         .to("0x742d35Cc6634C0532925a3b844Bc9e7595f3ABCD")
   *         .amount(new BigInteger("1000000")) // 1 USDC (6 decimals)
   *         .token("usdc")
   *         .network(NetworkEnum.BASE)
   *         .build()
   * );
   * }</pre>
   *
   * @param fromAddress the sender account address
   * @param options the transfer options (to, amount, token, network)
   * @return the transaction response with hash
   * @throws ApiException if the API call fails
   * @throws IllegalArgumentException if options are invalid
   */
  public SendEvmTransaction200Response transfer(String fromAddress, TransferOptions options)
      throws ApiException {
    return transfer(fromAddress, options, null);
  }

  /**
   * Transfers tokens from the specified account with idempotency key.
   *
   * @param fromAddress the sender account address
   * @param options the transfer options (to, amount, token, network)
   * @param idempotencyKey optional idempotency key for request deduplication
   * @return the transaction response with hash
   * @throws ApiException if the API call fails
   * @throws IllegalArgumentException if options are invalid
   */
  public SendEvmTransaction200Response transfer(
      String fromAddress, TransferOptions options, String idempotencyKey) throws ApiException {

    if (fromAddress == null || fromAddress.isBlank()) {
      throw new IllegalArgumentException("fromAddress is required");
    }
    if (options == null) {
      throw new IllegalArgumentException("options is required");
    }

    String transaction = buildTransferTransaction(options);

    SendEvmTransactionRequest request =
        new SendEvmTransactionRequest().network(options.network()).transaction(transaction);

    return sendTransaction(fromAddress, request, idempotencyKey);
  }

  /**
   * Builds the RLP-encoded transaction for a transfer.
   *
   * @param options the transfer options
   * @return the RLP-encoded transaction as a hex string
   */
  private String buildTransferTransaction(TransferOptions options) {
    if (TokenAddressResolver.isNativeEth(options.token())) {
      return TransactionBuilder.buildNativeTransfer(options.to(), options.amount());
    }

    String tokenAddress = TokenAddressResolver.resolve(options.token(), options.network());
    return TransactionBuilder.buildErc20Transfer(tokenAddress, options.to(), options.amount());
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

  // ==================== Spend Permissions ====================

  /**
   * Creates a spend permission for the specified smart account.
   *
   * @param address the smart account address
   * @param request the spend permission request
   * @return the user operation
   * @throws ApiException if the API call fails
   */
  public EvmUserOperation createSpendPermission(
      String address, CreateSpendPermissionRequest request) throws ApiException {
    return createSpendPermission(address, request, null);
  }

  /**
   * Creates a spend permission for the specified smart account with idempotency key.
   *
   * @param address the smart account address
   * @param request the spend permission request
   * @param idempotencyKey optional idempotency key
   * @return the user operation
   * @throws ApiException if the API call fails
   */
  public EvmUserOperation createSpendPermission(
      String address, CreateSpendPermissionRequest request, String idempotencyKey)
      throws ApiException {
    String walletJwt =
        generateWalletJwt(
            "POST", "/v2/evm/smart-accounts/" + address + "/spend-permissions", request);
    return smartAccountsApi.createSpendPermission(address, request, walletJwt, idempotencyKey);
  }

  /**
   * Lists spend permissions for a smart account.
   *
   * @param options the list options (must include address)
   * @return the list response
   * @throws ApiException if the API call fails
   */
  public ListSpendPermissions200Response listSpendPermissions(ListSpendPermissionsOptions options)
      throws ApiException {
    return smartAccountsApi.listSpendPermissions(
        options.address(), options.pageSize(), options.pageToken());
  }

  /**
   * Revokes an existing spend permission.
   *
   * @param address the smart account address
   * @param request the revoke request
   * @return the user operation
   * @throws ApiException if the API call fails
   */
  public EvmUserOperation revokeSpendPermission(
      String address, RevokeSpendPermissionRequest request) throws ApiException {
    return revokeSpendPermission(address, request, null);
  }

  /**
   * Revokes an existing spend permission with idempotency key.
   *
   * @param address the smart account address
   * @param request the revoke request
   * @param idempotencyKey optional idempotency key
   * @return the user operation
   * @throws ApiException if the API call fails
   */
  public EvmUserOperation revokeSpendPermission(
      String address, RevokeSpendPermissionRequest request, String idempotencyKey)
      throws ApiException {
    String walletJwt =
        generateWalletJwt(
            "POST", "/v2/evm/smart-accounts/" + address + "/spend-permissions/revoke", request);
    return smartAccountsApi.revokeSpendPermission(address, request, walletJwt, idempotencyKey);
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
