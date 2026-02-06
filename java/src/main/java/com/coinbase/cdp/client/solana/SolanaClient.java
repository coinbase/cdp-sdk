package com.coinbase.cdp.client.solana;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.auth.TokenProvider;
import com.coinbase.cdp.client.solana.SolanaClientOptions.GetAccountOptions;
import com.coinbase.cdp.client.solana.SolanaClientOptions.GetOrCreateAccountOptions;
import com.coinbase.cdp.client.solana.SolanaClientOptions.ListAccountsOptions;
import com.coinbase.cdp.client.solana.SolanaClientOptions.ListTokenBalancesOptions;
import com.coinbase.cdp.client.solana.SolanaClientOptions.TransferOptions;
import com.coinbase.cdp.openapi.ApiClient;
import com.coinbase.cdp.openapi.ApiException;
import com.coinbase.cdp.openapi.api.FaucetsApi;
import com.coinbase.cdp.openapi.api.SolanaAccountsApi;
import com.coinbase.cdp.openapi.api.SolanaTokenBalancesApi;
import com.coinbase.cdp.openapi.model.CreateSolanaAccountRequest;
import com.coinbase.cdp.openapi.model.ListSolanaAccounts200Response;
import com.coinbase.cdp.openapi.model.ListSolanaTokenBalances200Response;
import com.coinbase.cdp.openapi.model.RequestSolanaFaucet200Response;
import com.coinbase.cdp.openapi.model.RequestSolanaFaucetRequest;
import com.coinbase.cdp.openapi.model.SendSolanaTransaction200Response;
import com.coinbase.cdp.openapi.model.SendSolanaTransactionRequest;
import com.coinbase.cdp.openapi.model.SignSolanaMessage200Response;
import com.coinbase.cdp.openapi.model.SignSolanaMessageRequest;
import com.coinbase.cdp.openapi.model.SignSolanaTransaction200Response;
import com.coinbase.cdp.openapi.model.SignSolanaTransactionRequest;
import com.coinbase.cdp.openapi.model.SolanaAccount;
import com.coinbase.cdp.utils.SolanaMintAddressResolver;
import com.coinbase.cdp.utils.SolanaTransactionBuilder;
import org.p2p.solanaj.core.PublicKey;
import org.p2p.solanaj.rpc.RpcClient;
import org.p2p.solanaj.rpc.RpcException;

/**
 * The namespace client for Solana operations.
 *
 * <p>Provides high-level methods for creating, managing, and using Solana accounts. Wallet JWT
 * generation is handled automatically for write operations when using the instance-based pattern.
 *
 * <p>Methods accept generated OpenAPI request types directly to reduce boilerplate.
 *
 * <p>Usage patterns:
 *
 * <pre>{@code
 * // Pattern 1: From environment variables
 * try (CdpClient cdp = CdpClient.create()) {
 *     SolanaAccount account = cdp.solana().createAccount(
 *         new CreateSolanaAccountRequest().name("my-account")
 *     );
 * }
 *
 * // Pattern 2: With credentials
 * try (CdpClient cdp = CdpClient.builder()
 *         .credentials("api-key-id", "api-key-secret")
 *         .walletSecret("wallet-secret")
 *         .build()) {
 *     SolanaAccount account = cdp.solana().createAccount(
 *         new CreateSolanaAccountRequest().name("my-account")
 *     );
 * }
 *
 * // Pattern 3: With pre-generated TokenProvider
 * try (CdpClient cdp = CdpClient.builder()
 *         .tokenProvider(myTokenProvider)
 *         .build()) {
 *     SolanaAccount account = cdp.solana().createAccount(
 *         new CreateSolanaAccountRequest().name("my-account")
 *     );
 * }
 * }</pre>
 */
public class SolanaClient {

  private static final String SOLANA_MAINNET_RPC = "https://api.mainnet-beta.solana.com";
  private static final String SOLANA_DEVNET_RPC = "https://api.devnet.solana.com";

  /** Default USDC decimals. */
  private static final int USDC_DECIMALS = 6;

  private final CdpClient cdpClient;
  private final TokenProvider tokenProvider;
  private final SolanaAccountsApi accountsApi;
  private final SolanaTokenBalancesApi tokenBalancesApi;
  private final FaucetsApi faucetsApi;

  /**
   * Creates a new Solana client for instance-based usage.
   *
   * @param cdpClient the parent CDP client
   */
  public SolanaClient(CdpClient cdpClient) {
    this.cdpClient = cdpClient;
    this.tokenProvider = null;
    ApiClient apiClient = cdpClient.getApiClient();
    this.accountsApi = new SolanaAccountsApi(apiClient);
    this.tokenBalancesApi = new SolanaTokenBalancesApi(apiClient);
    this.faucetsApi = new FaucetsApi(apiClient);
  }

  /**
   * Creates a new Solana client for static factory usage with pre-generated tokens.
   *
   * @param apiClient the pre-configured API client with tokens
   * @param tokenProvider the token provider containing pre-generated tokens
   */
  public SolanaClient(ApiClient apiClient, TokenProvider tokenProvider) {
    this.cdpClient = null;
    this.tokenProvider = tokenProvider;
    this.accountsApi = new SolanaAccountsApi(apiClient);
    this.tokenBalancesApi = new SolanaTokenBalancesApi(apiClient);
    this.faucetsApi = new FaucetsApi(apiClient);
  }

  // ==================== Accounts ====================

  /**
   * Creates a new Solana account with default options.
   *
   * @return the created account
   * @throws ApiException if the API call fails
   */
  public SolanaAccount createAccount() throws ApiException {
    return createAccount(new CreateSolanaAccountRequest());
  }

  /**
   * Creates a new Solana account.
   *
   * @param request the account creation request
   * @return the created account
   * @throws ApiException if the API call fails
   */
  public SolanaAccount createAccount(CreateSolanaAccountRequest request) throws ApiException {
    return createAccount(request, null);
  }

  /**
   * Creates a new Solana account with idempotency key.
   *
   * @param request the account creation request
   * @param idempotencyKey optional idempotency key
   * @return the created account
   * @throws ApiException if the API call fails
   */
  public SolanaAccount createAccount(CreateSolanaAccountRequest request, String idempotencyKey)
      throws ApiException {
    String walletJwt = generateWalletJwt("POST", "/v2/solana/accounts", request);
    return accountsApi.createSolanaAccount(walletJwt, idempotencyKey, request);
  }

  /**
   * Gets a Solana account by address or name.
   *
   * @param options the get options (must include address or name)
   * @return the account
   * @throws ApiException if the API call fails
   * @throws IllegalArgumentException if neither address nor name is provided
   */
  public SolanaAccount getAccount(GetAccountOptions options) throws ApiException {
    if (options.address() != null) {
      return accountsApi.getSolanaAccount(options.address());
    }
    if (options.name() != null) {
      return accountsApi.getSolanaAccountByName(options.name());
    }
    throw new IllegalArgumentException("Either address or name must be provided");
  }

  /**
   * Gets a Solana account, or creates one if it doesn't exist.
   *
   * @param options the options (must include name)
   * @return the account
   * @throws ApiException if the API call fails
   */
  public SolanaAccount getOrCreateAccount(GetOrCreateAccountOptions options) throws ApiException {
    try {
      return accountsApi.getSolanaAccountByName(options.name());
    } catch (ApiException e) {
      if (e.getCode() == 404) {
        try {
          return createAccount(
              new CreateSolanaAccountRequest()
                  .name(options.name())
                  .accountPolicy(options.accountPolicy()));
        } catch (ApiException createError) {
          if (createError.getCode() == 409) {
            return accountsApi.getSolanaAccountByName(options.name());
          }
          throw createError;
        }
      }
      throw e;
    }
  }

  /**
   * Lists Solana accounts.
   *
   * @return the list response
   * @throws ApiException if the API call fails
   */
  public ListSolanaAccounts200Response listAccounts() throws ApiException {
    return listAccounts(ListAccountsOptions.builder().build());
  }

  /**
   * Lists Solana accounts with pagination.
   *
   * @param options the list options
   * @return the list response
   * @throws ApiException if the API call fails
   */
  public ListSolanaAccounts200Response listAccounts(ListAccountsOptions options)
      throws ApiException {
    return accountsApi.listSolanaAccounts(options.pageSize(), options.pageToken());
  }

  // ==================== Signing Operations ====================

  /**
   * Signs a message with the specified Solana account.
   *
   * @param address the account address
   * @param request the sign request
   * @return the signature response
   * @throws ApiException if the API call fails
   */
  public SignSolanaMessage200Response signMessage(String address, SignSolanaMessageRequest request)
      throws ApiException {
    return signMessage(address, request, null);
  }

  /**
   * Signs a message with the specified Solana account and idempotency key.
   *
   * @param address the account address
   * @param request the sign request
   * @param idempotencyKey optional idempotency key
   * @return the signature response
   * @throws ApiException if the API call fails
   */
  public SignSolanaMessage200Response signMessage(
      String address, SignSolanaMessageRequest request, String idempotencyKey) throws ApiException {
    String walletJwt =
        generateWalletJwt("POST", "/v2/solana/accounts/" + address + "/sign/message", request);
    return accountsApi.signSolanaMessage(address, walletJwt, idempotencyKey, request);
  }

  /**
   * Signs a transaction with the specified Solana account.
   *
   * @param address the account address
   * @param request the sign request
   * @return the signature response
   * @throws ApiException if the API call fails
   */
  public SignSolanaTransaction200Response signTransaction(
      String address, SignSolanaTransactionRequest request) throws ApiException {
    return signTransaction(address, request, null);
  }

  /**
   * Signs a transaction with the specified Solana account and idempotency key.
   *
   * @param address the account address
   * @param request the sign request
   * @param idempotencyKey optional idempotency key
   * @return the signature response
   * @throws ApiException if the API call fails
   */
  public SignSolanaTransaction200Response signTransaction(
      String address, SignSolanaTransactionRequest request, String idempotencyKey)
      throws ApiException {
    String walletJwt =
        generateWalletJwt("POST", "/v2/solana/accounts/" + address + "/sign/transaction", request);
    return accountsApi.signSolanaTransaction(address, walletJwt, idempotencyKey, request);
  }

  // ==================== Transactions ====================

  /**
   * Sends a transaction from the specified Solana account.
   *
   * @param address the account address (used for JWT generation)
   * @param request the transaction request
   * @return the transaction response
   * @throws ApiException if the API call fails
   */
  public SendSolanaTransaction200Response sendTransaction(
      String address, SendSolanaTransactionRequest request) throws ApiException {
    return sendTransaction(address, request, null);
  }

  /**
   * Sends a transaction from the specified Solana account with idempotency key.
   *
   * @param address the account address (used for JWT generation)
   * @param request the transaction request
   * @param idempotencyKey optional idempotency key
   * @return the transaction response
   * @throws ApiException if the API call fails
   */
  public SendSolanaTransaction200Response sendTransaction(
      String address, SendSolanaTransactionRequest request, String idempotencyKey)
      throws ApiException {
    String walletJwt =
        generateWalletJwt("POST", "/v2/solana/accounts/" + address + "/send/transaction", request);
    return accountsApi.sendSolanaTransaction(walletJwt, idempotencyKey, request);
  }

  // ==================== Transfers ====================

  /**
   * Transfers SOL or SPL tokens from the specified account.
   *
   * <p>Supports native SOL transfers and SPL token transfers (including automatic creation of
   * destination associated token accounts if needed).
   *
   * <p>Example usage:
   *
   * <pre>{@code
   * // Transfer native SOL
   * var result = solanaClient.transfer(
   *     account.getAddress(),
   *     TransferOptions.builder()
   *         .to("recipientAddress...")
   *         .amount(new BigInteger("1000000000")) // 1 SOL in lamports
   *         .token("sol")
   *         .network(NetworkEnum.SOLANA_DEVNET)
   *         .build()
   * );
   *
   * // Transfer USDC
   * var result = solanaClient.transfer(
   *     account.getAddress(),
   *     TransferOptions.builder()
   *         .to("recipientAddress...")
   *         .amount(new BigInteger("1000000")) // 1 USDC (6 decimals)
   *         .token("usdc")
   *         .network(NetworkEnum.SOLANA_DEVNET)
   *         .build()
   * );
   * }</pre>
   *
   * @param fromAddress the sender account address
   * @param options the transfer options (to, amount, token, network)
   * @return the transaction response with signature
   * @throws ApiException if the API call fails
   */
  public SendSolanaTransaction200Response transfer(String fromAddress, TransferOptions options)
      throws ApiException {
    return transfer(fromAddress, options, null);
  }

  /**
   * Transfers SOL or SPL tokens with idempotency key.
   *
   * @param fromAddress the sender account address
   * @param options the transfer options (to, amount, token, network)
   * @param idempotencyKey optional idempotency key for request deduplication
   * @return the transaction response with signature
   * @throws ApiException if the API call fails
   */
  public SendSolanaTransaction200Response transfer(
      String fromAddress, TransferOptions options, String idempotencyKey) throws ApiException {

    if (fromAddress == null || fromAddress.isBlank()) {
      throw new IllegalArgumentException("fromAddress is required");
    }
    if (options == null) {
      throw new IllegalArgumentException("options is required");
    }

    String base64Transaction = buildTransferTransaction(fromAddress, options);

    var request =
        new SendSolanaTransactionRequest()
            .network(options.network())
            .transaction(base64Transaction);

    return sendTransaction(fromAddress, request, idempotencyKey);
  }

  /**
   * Builds the base64-encoded transaction for a transfer.
   *
   * @param fromAddress the sender address
   * @param options the transfer options
   * @return the base64-encoded unsigned transaction
   */
  private String buildTransferTransaction(String fromAddress, TransferOptions options) {
    String rpcUrl =
        options.network() == SendSolanaTransactionRequest.NetworkEnum.SOLANA
            ? SOLANA_MAINNET_RPC
            : SOLANA_DEVNET_RPC;
    RpcClient rpcClient = new RpcClient(rpcUrl);

    try {
      PublicKey from = new PublicKey(fromAddress);
      PublicKey to = new PublicKey(options.to());

      if (SolanaMintAddressResolver.isNativeSol(options.token())) {
        return SolanaTransactionBuilder.buildNativeTransfer(rpcClient, from, to, options.amount());
      }

      String mintAddress = SolanaMintAddressResolver.resolve(options.token(), options.network());
      PublicKey mint = new PublicKey(mintAddress);

      // Use USDC decimals for known tokens, otherwise default to 6
      int decimals = USDC_DECIMALS;

      return SolanaTransactionBuilder.buildSplTokenTransfer(
          rpcClient, from, to, mint, options.amount(), decimals);
    } catch (RpcException e) {
      throw new RuntimeException("Failed to build Solana transaction: " + e.getMessage(), e);
    }
  }

  // ==================== Token Balances ====================

  /**
   * Lists token balances for an address.
   *
   * @param options the options
   * @return the token balances
   * @throws ApiException if the API call fails
   */
  public ListSolanaTokenBalances200Response listTokenBalances(ListTokenBalancesOptions options)
      throws ApiException {
    return tokenBalancesApi.listSolanaTokenBalances(
        options.address(), options.network(), options.pageSize(), options.pageToken());
  }

  // ==================== Faucet ====================

  /**
   * Requests funds from a Solana faucet.
   *
   * @param request the faucet request
   * @return the faucet response
   * @throws ApiException if the API call fails
   */
  public RequestSolanaFaucet200Response requestFaucet(RequestSolanaFaucetRequest request)
      throws ApiException {
    return faucetsApi.requestSolanaFaucet(request);
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
