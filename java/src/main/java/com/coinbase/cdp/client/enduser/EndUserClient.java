package com.coinbase.cdp.client.enduser;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.auth.TokenProvider;
import com.coinbase.cdp.client.enduser.EndUserClientOptions.ListEndUsersOptions;
import com.coinbase.cdp.openapi.ApiClient;
import com.coinbase.cdp.openapi.ApiException;
import com.coinbase.cdp.openapi.api.EmbeddedWalletsApi;
import com.coinbase.cdp.openapi.api.EndUserAccountsApi;
import com.coinbase.cdp.openapi.model.AddEndUserEvmAccount201Response;
import com.coinbase.cdp.openapi.model.AddEndUserEvmSmartAccount201Response;
import com.coinbase.cdp.openapi.model.AddEndUserEvmSmartAccountRequest;
import com.coinbase.cdp.openapi.model.AddEndUserSolanaAccount201Response;
import com.coinbase.cdp.openapi.model.CreateEndUserRequest;
import com.coinbase.cdp.openapi.model.CreateEvmEip7702DelegationWithEndUserAccount201Response;
import com.coinbase.cdp.openapi.model.CreateEvmEip7702DelegationWithEndUserAccountRequest;
import com.coinbase.cdp.openapi.model.EndUser;
import com.coinbase.cdp.openapi.model.EvmUserOperation;
import com.coinbase.cdp.openapi.model.ImportEndUserRequest;
import com.coinbase.cdp.openapi.model.ListEndUsers200Response;
import com.coinbase.cdp.openapi.model.RevokeDelegationForEndUserRequest;
import com.coinbase.cdp.openapi.model.SendEvmAssetWithEndUserAccount200Response;
import com.coinbase.cdp.openapi.model.SendEvmAssetWithEndUserAccountRequest;
import com.coinbase.cdp.openapi.model.SendEvmTransactionWithEndUserAccount200Response;
import com.coinbase.cdp.openapi.model.SendEvmTransactionWithEndUserAccountRequest;
import com.coinbase.cdp.openapi.model.SendSolanaAssetWithEndUserAccountRequest;
import com.coinbase.cdp.openapi.model.SendSolanaTransactionWithEndUserAccount200Response;
import com.coinbase.cdp.openapi.model.SendSolanaTransactionWithEndUserAccountRequest;
import com.coinbase.cdp.openapi.model.SendUserOperationWithEndUserAccountRequest;
import com.coinbase.cdp.openapi.model.SignEvmMessageWithEndUserAccount200Response;
import com.coinbase.cdp.openapi.model.SignEvmMessageWithEndUserAccountRequest;
import com.coinbase.cdp.openapi.model.SignEvmTransactionWithEndUserAccount200Response;
import com.coinbase.cdp.openapi.model.SignEvmTransactionWithEndUserAccountRequest;
import com.coinbase.cdp.openapi.model.SignEvmTypedDataWithEndUserAccount200Response;
import com.coinbase.cdp.openapi.model.SignEvmTypedDataWithEndUserAccountRequest;
import com.coinbase.cdp.openapi.model.SignSolanaMessageWithEndUserAccount200Response;
import com.coinbase.cdp.openapi.model.SignSolanaMessageWithEndUserAccountRequest;
import com.coinbase.cdp.openapi.model.SignSolanaTransactionWithEndUserAccount200Response;
import com.coinbase.cdp.openapi.model.SignSolanaTransactionWithEndUserAccountRequest;
import com.coinbase.cdp.openapi.model.ValidateEndUserAccessTokenRequest;
import java.util.UUID;

/**
 * The namespace client for end user operations.
 *
 * <p>Provides high-level methods for creating, managing, and performing delegated operations on end
 * users. Wallet JWT generation is handled automatically for write operations when using the
 * instance-based pattern.
 *
 * <p>Usage patterns:
 *
 * <pre>{@code
 * // Pattern 1: From environment variables
 * try (CdpClient cdp = CdpClient.create()) {
 *     EndUser endUser = cdp.endUser().createEndUser(
 *         new CreateEndUserRequest()
 *             .userId(UUID.randomUUID().toString())
 *             .authenticationMethods(List.of(...))
 *     );
 * }
 *
 * // Pattern 2: With credentials
 * try (CdpClient cdp = CdpClient.builder()
 *         .credentials("api-key-id", "api-key-secret")
 *         .walletSecret("wallet-secret")
 *         .build()) {
 *     EndUser endUser = cdp.endUser().createEndUser(
 *         new CreateEndUserRequest()
 *             .userId(UUID.randomUUID().toString())
 *             .authenticationMethods(List.of(...))
 *     );
 * }
 *
 * // Pattern 3: With pre-generated TokenProvider
 * try (CdpClient cdp = CdpClient.builder()
 *         .tokenProvider(myTokenProvider)
 *         .build()) {
 *     EndUser endUser = cdp.endUser().createEndUser(
 *         new CreateEndUserRequest()
 *             .userId(UUID.randomUUID().toString())
 *             .authenticationMethods(List.of(...))
 *     );
 * }
 * }</pre>
 */
public class EndUserClient {

  private final CdpClient cdpClient;
  private final TokenProvider tokenProvider;
  private final EndUserAccountsApi endUserAccountsApi;
  private final EmbeddedWalletsApi embeddedWalletsApi;

  /**
   * Creates a new EndUser client for instance-based usage.
   *
   * @param cdpClient the parent CDP client
   */
  public EndUserClient(CdpClient cdpClient) {
    this.cdpClient = cdpClient;
    this.tokenProvider = null;
    ApiClient apiClient = cdpClient.getApiClient();
    this.endUserAccountsApi = new EndUserAccountsApi(apiClient);
    this.embeddedWalletsApi = new EmbeddedWalletsApi(apiClient);
  }

  /**
   * Creates a new EndUser client for static factory usage with pre-generated tokens.
   *
   * @param apiClient the pre-configured API client with tokens
   * @param tokenProvider the token provider containing pre-generated tokens
   */
  public EndUserClient(ApiClient apiClient, TokenProvider tokenProvider) {
    this.cdpClient = null;
    this.tokenProvider = tokenProvider;
    this.endUserAccountsApi = new EndUserAccountsApi(apiClient);
    this.embeddedWalletsApi = new EmbeddedWalletsApi(apiClient);
  }

  // ==================== CRUD Operations ====================

  /**
   * Creates an end user with a generated UUID.
   *
   * @param request the creation request
   * @return the created end user
   * @throws ApiException if the API call fails
   */
  public EndUser createEndUser(CreateEndUserRequest request) throws ApiException {
    return createEndUser(request, null);
  }

  /**
   * Creates an end user with idempotency key.
   *
   * <p>If the request does not include a userId, one is generated automatically.
   *
   * @param request the creation request
   * @param idempotencyKey optional idempotency key
   * @return the created end user
   * @throws ApiException if the API call fails
   */
  public EndUser createEndUser(CreateEndUserRequest request, String idempotencyKey)
      throws ApiException {
    if (request.getUserId() == null) {
      request.setUserId(UUID.randomUUID().toString());
    }
    String walletJwt = generateWalletJwt("POST", "/v2/end-users", request);
    return endUserAccountsApi.createEndUser(walletJwt, idempotencyKey, request);
  }

  /**
   * Lists end users with default options.
   *
   * @return the list response
   * @throws ApiException if the API call fails
   */
  public ListEndUsers200Response listEndUsers() throws ApiException {
    return listEndUsers(ListEndUsersOptions.builder().build());
  }

  /**
   * Lists end users with pagination and sorting.
   *
   * @param options the list options
   * @return the list response
   * @throws ApiException if the API call fails
   */
  public ListEndUsers200Response listEndUsers(ListEndUsersOptions options) throws ApiException {
    return endUserAccountsApi.listEndUsers(options.pageSize(), options.pageToken(), options.sort());
  }

  /**
   * Gets an end user by ID.
   *
   * @param userId the end user ID
   * @return the end user
   * @throws ApiException if the API call fails
   */
  public EndUser getEndUser(String userId) throws ApiException {
    return endUserAccountsApi.getEndUser(userId);
  }

  /**
   * Validates an end user's access token.
   *
   * @param request the validation request
   * @return the end user if the token is valid
   * @throws ApiException if the API call fails or the token is invalid
   */
  public EndUser validateAccessToken(ValidateEndUserAccessTokenRequest request)
      throws ApiException {
    return endUserAccountsApi.validateEndUserAccessToken(request);
  }

  /**
   * Imports an existing private key for an end user.
   *
   * <p>Note: The private key must be encrypted before calling this method. Use the CDP RSA public
   * key to encrypt the private key with OAEP SHA-256 padding, then base64 encode the result.
   *
   * @param request the import request (must contain the encrypted private key)
   * @return the imported end user
   * @throws ApiException if the API call fails
   */
  public EndUser importEndUser(ImportEndUserRequest request) throws ApiException {
    return importEndUser(request, null);
  }

  /**
   * Imports an existing private key for an end user with idempotency key.
   *
   * @param request the import request (must contain the encrypted private key)
   * @param idempotencyKey optional idempotency key
   * @return the imported end user
   * @throws ApiException if the API call fails
   */
  public EndUser importEndUser(ImportEndUserRequest request, String idempotencyKey)
      throws ApiException {
    if (request.getUserId() == null) {
      request.setUserId(UUID.randomUUID().toString());
    }
    String walletJwt = generateWalletJwt("POST", "/v2/end-users/import", request);
    return endUserAccountsApi.importEndUser(walletJwt, idempotencyKey, request);
  }

  /**
   * Adds an EVM EOA account to an existing end user.
   *
   * @param userId the end user ID
   * @return the result containing the new EVM account
   * @throws ApiException if the API call fails
   */
  public AddEndUserEvmAccount201Response addEndUserEvmAccount(String userId) throws ApiException {
    return addEndUserEvmAccount(userId, null);
  }

  /**
   * Adds an EVM EOA account to an existing end user with idempotency key.
   *
   * @param userId the end user ID
   * @param idempotencyKey optional idempotency key
   * @return the result containing the new EVM account
   * @throws ApiException if the API call fails
   */
  public AddEndUserEvmAccount201Response addEndUserEvmAccount(String userId, String idempotencyKey)
      throws ApiException {
    Object body = new Object();
    String walletJwt = generateWalletJwt("POST", "/v2/end-users/" + userId + "/evm/accounts", body);
    return endUserAccountsApi.addEndUserEvmAccount(userId, walletJwt, idempotencyKey, body);
  }

  /**
   * Adds an EVM smart account to an existing end user.
   *
   * @param userId the end user ID
   * @param request the smart account creation request
   * @return the result containing the new EVM smart account
   * @throws ApiException if the API call fails
   */
  public AddEndUserEvmSmartAccount201Response addEndUserEvmSmartAccount(
      String userId, AddEndUserEvmSmartAccountRequest request) throws ApiException {
    return addEndUserEvmSmartAccount(userId, request, null);
  }

  /**
   * Adds an EVM smart account to an existing end user with idempotency key.
   *
   * @param userId the end user ID
   * @param request the smart account creation request
   * @param idempotencyKey optional idempotency key
   * @return the result containing the new EVM smart account
   * @throws ApiException if the API call fails
   */
  public AddEndUserEvmSmartAccount201Response addEndUserEvmSmartAccount(
      String userId, AddEndUserEvmSmartAccountRequest request, String idempotencyKey)
      throws ApiException {
    String walletJwt =
        generateWalletJwt("POST", "/v2/end-users/" + userId + "/evm/smart-accounts", request);
    return endUserAccountsApi.addEndUserEvmSmartAccount(userId, walletJwt, idempotencyKey, request);
  }

  /**
   * Adds a Solana account to an existing end user.
   *
   * @param userId the end user ID
   * @return the result containing the new Solana account
   * @throws ApiException if the API call fails
   */
  public AddEndUserSolanaAccount201Response addEndUserSolanaAccount(String userId)
      throws ApiException {
    return addEndUserSolanaAccount(userId, null);
  }

  /**
   * Adds a Solana account to an existing end user with idempotency key.
   *
   * @param userId the end user ID
   * @param idempotencyKey optional idempotency key
   * @return the result containing the new Solana account
   * @throws ApiException if the API call fails
   */
  public AddEndUserSolanaAccount201Response addEndUserSolanaAccount(
      String userId, String idempotencyKey) throws ApiException {
    Object body = new Object();
    String walletJwt =
        generateWalletJwt("POST", "/v2/end-users/" + userId + "/solana/accounts", body);
    return endUserAccountsApi.addEndUserSolanaAccount(userId, walletJwt, idempotencyKey, body);
  }

  // ==================== Delegation Management ====================

  /**
   * Revokes all active delegations for an end user.
   *
   * @param userId the end user ID
   * @throws ApiException if the API call fails
   */
  public void revokeDelegation(String userId) throws ApiException {
    RevokeDelegationForEndUserRequest request = new RevokeDelegationForEndUserRequest();
    String walletJwt =
        generateWalletJwt("POST", "/v2/end-users/" + userId + "/revoke-delegation", request);
    embeddedWalletsApi.revokeDelegationForEndUser(userId, request, walletJwt, null, null);
  }

  // ==================== Delegated EVM Sign Methods ====================

  /**
   * Signs an EVM transaction on behalf of an end user.
   *
   * @param userId the end user ID
   * @param request the sign transaction request
   * @return the signed transaction result
   * @throws ApiException if the API call fails
   */
  public SignEvmTransactionWithEndUserAccount200Response signEvmTransaction(
      String userId, SignEvmTransactionWithEndUserAccountRequest request) throws ApiException {
    return signEvmTransaction(userId, request, null);
  }

  /**
   * Signs an EVM transaction on behalf of an end user with idempotency key.
   *
   * @param userId the end user ID
   * @param request the sign transaction request
   * @param idempotencyKey optional idempotency key
   * @return the signed transaction result
   * @throws ApiException if the API call fails
   */
  public SignEvmTransactionWithEndUserAccount200Response signEvmTransaction(
      String userId, SignEvmTransactionWithEndUserAccountRequest request, String idempotencyKey)
      throws ApiException {
    String walletJwt =
        generateWalletJwt("POST", "/v2/end-users/" + userId + "/evm/sign-transaction", request);
    return embeddedWalletsApi.signEvmTransactionWithEndUserAccount(
        userId, walletJwt, idempotencyKey, null, null, request);
  }

  /**
   * Signs an EVM message (EIP-191) on behalf of an end user.
   *
   * @param userId the end user ID
   * @param request the sign message request
   * @return the signature result
   * @throws ApiException if the API call fails
   */
  public SignEvmMessageWithEndUserAccount200Response signEvmMessage(
      String userId, SignEvmMessageWithEndUserAccountRequest request) throws ApiException {
    return signEvmMessage(userId, request, null);
  }

  /**
   * Signs an EVM message on behalf of an end user with idempotency key.
   *
   * @param userId the end user ID
   * @param request the sign message request
   * @param idempotencyKey optional idempotency key
   * @return the signature result
   * @throws ApiException if the API call fails
   */
  public SignEvmMessageWithEndUserAccount200Response signEvmMessage(
      String userId, SignEvmMessageWithEndUserAccountRequest request, String idempotencyKey)
      throws ApiException {
    String walletJwt =
        generateWalletJwt("POST", "/v2/end-users/" + userId + "/evm/sign-message", request);
    return embeddedWalletsApi.signEvmMessageWithEndUserAccount(
        userId, walletJwt, idempotencyKey, null, null, request);
  }

  /**
   * Signs EVM EIP-712 typed data on behalf of an end user.
   *
   * @param userId the end user ID
   * @param request the typed data request
   * @return the signature result
   * @throws ApiException if the API call fails
   */
  public SignEvmTypedDataWithEndUserAccount200Response signEvmTypedData(
      String userId, SignEvmTypedDataWithEndUserAccountRequest request) throws ApiException {
    return signEvmTypedData(userId, request, null);
  }

  /**
   * Signs EVM typed data on behalf of an end user with idempotency key.
   *
   * @param userId the end user ID
   * @param request the typed data request
   * @param idempotencyKey optional idempotency key
   * @return the signature result
   * @throws ApiException if the API call fails
   */
  public SignEvmTypedDataWithEndUserAccount200Response signEvmTypedData(
      String userId, SignEvmTypedDataWithEndUserAccountRequest request, String idempotencyKey)
      throws ApiException {
    String walletJwt =
        generateWalletJwt("POST", "/v2/end-users/" + userId + "/evm/sign-typed-data", request);
    return embeddedWalletsApi.signEvmTypedDataWithEndUserAccount(
        userId, walletJwt, idempotencyKey, null, null, request);
  }

  // ==================== Delegated EVM Send Methods ====================

  /**
   * Sends an EVM transaction on behalf of an end user.
   *
   * @param userId the end user ID
   * @param request the send transaction request
   * @return the transaction result
   * @throws ApiException if the API call fails
   */
  public SendEvmTransactionWithEndUserAccount200Response sendEvmTransaction(
      String userId, SendEvmTransactionWithEndUserAccountRequest request) throws ApiException {
    return sendEvmTransaction(userId, request, null);
  }

  /**
   * Sends an EVM transaction on behalf of an end user with idempotency key.
   *
   * @param userId the end user ID
   * @param request the send transaction request
   * @param idempotencyKey optional idempotency key
   * @return the transaction result
   * @throws ApiException if the API call fails
   */
  public SendEvmTransactionWithEndUserAccount200Response sendEvmTransaction(
      String userId, SendEvmTransactionWithEndUserAccountRequest request, String idempotencyKey)
      throws ApiException {
    String walletJwt =
        generateWalletJwt("POST", "/v2/end-users/" + userId + "/evm/send-transaction", request);
    return embeddedWalletsApi.sendEvmTransactionWithEndUserAccount(
        userId, walletJwt, idempotencyKey, null, null, request);
  }

  /**
   * Sends an EVM asset (e.g. USDC) on behalf of an end user.
   *
   * @param userId the end user ID
   * @param address the sender's EVM address
   * @param asset the asset to send (e.g. "usdc")
   * @param request the send asset request
   * @return the transaction result
   * @throws ApiException if the API call fails
   */
  public SendEvmAssetWithEndUserAccount200Response sendEvmAsset(
      String userId, String address, String asset, SendEvmAssetWithEndUserAccountRequest request)
      throws ApiException {
    return sendEvmAsset(userId, address, asset, request, null);
  }

  /**
   * Sends an EVM asset on behalf of an end user with idempotency key.
   *
   * @param userId the end user ID
   * @param address the sender's EVM address
   * @param asset the asset to send (e.g. "usdc")
   * @param request the send asset request
   * @param idempotencyKey optional idempotency key
   * @return the transaction result
   * @throws ApiException if the API call fails
   */
  public SendEvmAssetWithEndUserAccount200Response sendEvmAsset(
      String userId,
      String address,
      String asset,
      SendEvmAssetWithEndUserAccountRequest request,
      String idempotencyKey)
      throws ApiException {
    String walletJwt =
        generateWalletJwt(
            "POST",
            "/v2/end-users/" + userId + "/evm/accounts/" + address + "/send/" + asset,
            request);
    return embeddedWalletsApi.sendEvmAssetWithEndUserAccount(
        userId, address, asset, walletJwt, idempotencyKey, null, null, request);
  }

  /**
   * Sends a user operation on behalf of an end user's smart account.
   *
   * @param userId the end user ID
   * @param address the smart account address
   * @param request the user operation request
   * @return the user operation result
   * @throws ApiException if the API call fails
   */
  public EvmUserOperation sendUserOperation(
      String userId, String address, SendUserOperationWithEndUserAccountRequest request)
      throws ApiException {
    return sendUserOperation(userId, address, request, null);
  }

  /**
   * Sends a user operation on behalf of an end user's smart account with idempotency key.
   *
   * @param userId the end user ID
   * @param address the smart account address
   * @param request the user operation request
   * @param idempotencyKey optional idempotency key
   * @return the user operation result
   * @throws ApiException if the API call fails
   */
  public EvmUserOperation sendUserOperation(
      String userId,
      String address,
      SendUserOperationWithEndUserAccountRequest request,
      String idempotencyKey)
      throws ApiException {
    String walletJwt =
        generateWalletJwt(
            "POST",
            "/v2/end-users/" + userId + "/evm/smart-accounts/" + address + "/send/user-operation",
            request);
    return embeddedWalletsApi.sendUserOperationWithEndUserAccount(
        userId, address, idempotencyKey, walletJwt, null, null, request);
  }

  /**
   * Creates an EVM EIP-7702 delegation on behalf of an end user.
   *
   * @param userId the end user ID
   * @param request the delegation request
   * @return the delegation result
   * @throws ApiException if the API call fails
   */
  public CreateEvmEip7702DelegationWithEndUserAccount201Response createEvmEip7702Delegation(
      String userId, CreateEvmEip7702DelegationWithEndUserAccountRequest request)
      throws ApiException {
    return createEvmEip7702Delegation(userId, request, null);
  }

  /**
   * Creates an EVM EIP-7702 delegation with idempotency key.
   *
   * @param userId the end user ID
   * @param request the delegation request
   * @param idempotencyKey optional idempotency key
   * @return the delegation result
   * @throws ApiException if the API call fails
   */
  public CreateEvmEip7702DelegationWithEndUserAccount201Response createEvmEip7702Delegation(
      String userId,
      CreateEvmEip7702DelegationWithEndUserAccountRequest request,
      String idempotencyKey)
      throws ApiException {
    String walletJwt =
        generateWalletJwt(
            "POST", "/v2/end-users/" + userId + "/evm/create-eip7702-delegation", request);
    return embeddedWalletsApi.createEvmEip7702DelegationWithEndUserAccount(
        userId, request, walletJwt, idempotencyKey, null, null);
  }

  // ==================== Delegated Solana Sign Methods ====================

  /**
   * Signs a Solana message on behalf of an end user.
   *
   * @param userId the end user ID
   * @param request the sign message request
   * @return the signature result
   * @throws ApiException if the API call fails
   */
  public SignSolanaMessageWithEndUserAccount200Response signSolanaMessage(
      String userId, SignSolanaMessageWithEndUserAccountRequest request) throws ApiException {
    return signSolanaMessage(userId, request, null);
  }

  /**
   * Signs a Solana message on behalf of an end user with idempotency key.
   *
   * @param userId the end user ID
   * @param request the sign message request
   * @param idempotencyKey optional idempotency key
   * @return the signature result
   * @throws ApiException if the API call fails
   */
  public SignSolanaMessageWithEndUserAccount200Response signSolanaMessage(
      String userId, SignSolanaMessageWithEndUserAccountRequest request, String idempotencyKey)
      throws ApiException {
    String walletJwt =
        generateWalletJwt("POST", "/v2/end-users/" + userId + "/solana/sign-message", request);
    return embeddedWalletsApi.signSolanaMessageWithEndUserAccount(
        userId, walletJwt, idempotencyKey, null, null, request);
  }

  /**
   * Signs a Solana transaction on behalf of an end user.
   *
   * @param userId the end user ID
   * @param request the sign transaction request
   * @return the signed transaction result
   * @throws ApiException if the API call fails
   */
  public SignSolanaTransactionWithEndUserAccount200Response signSolanaTransaction(
      String userId, SignSolanaTransactionWithEndUserAccountRequest request) throws ApiException {
    return signSolanaTransaction(userId, request, null);
  }

  /**
   * Signs a Solana transaction on behalf of an end user with idempotency key.
   *
   * @param userId the end user ID
   * @param request the sign transaction request
   * @param idempotencyKey optional idempotency key
   * @return the signed transaction result
   * @throws ApiException if the API call fails
   */
  public SignSolanaTransactionWithEndUserAccount200Response signSolanaTransaction(
      String userId, SignSolanaTransactionWithEndUserAccountRequest request, String idempotencyKey)
      throws ApiException {
    String walletJwt =
        generateWalletJwt("POST", "/v2/end-users/" + userId + "/solana/sign-transaction", request);
    return embeddedWalletsApi.signSolanaTransactionWithEndUserAccount(
        userId, walletJwt, idempotencyKey, null, null, request);
  }

  // ==================== Delegated Solana Send Methods ====================

  /**
   * Sends a Solana transaction on behalf of an end user.
   *
   * @param userId the end user ID
   * @param request the send transaction request
   * @return the transaction result
   * @throws ApiException if the API call fails
   */
  public SendSolanaTransactionWithEndUserAccount200Response sendSolanaTransaction(
      String userId, SendSolanaTransactionWithEndUserAccountRequest request) throws ApiException {
    return sendSolanaTransaction(userId, request, null);
  }

  /**
   * Sends a Solana transaction on behalf of an end user with idempotency key.
   *
   * @param userId the end user ID
   * @param request the send transaction request
   * @param idempotencyKey optional idempotency key
   * @return the transaction result
   * @throws ApiException if the API call fails
   */
  public SendSolanaTransactionWithEndUserAccount200Response sendSolanaTransaction(
      String userId, SendSolanaTransactionWithEndUserAccountRequest request, String idempotencyKey)
      throws ApiException {
    String walletJwt =
        generateWalletJwt("POST", "/v2/end-users/" + userId + "/solana/send-transaction", request);
    return embeddedWalletsApi.sendSolanaTransactionWithEndUserAccount(
        userId, walletJwt, idempotencyKey, null, null, request);
  }

  /**
   * Sends a Solana asset (e.g. USDC) on behalf of an end user.
   *
   * @param userId the end user ID
   * @param address the sender's Solana address
   * @param asset the asset to send (e.g. "usdc")
   * @param request the send asset request
   * @return the transaction result
   * @throws ApiException if the API call fails
   */
  public SendSolanaTransactionWithEndUserAccount200Response sendSolanaAsset(
      String userId, String address, String asset, SendSolanaAssetWithEndUserAccountRequest request)
      throws ApiException {
    return sendSolanaAsset(userId, address, asset, request, null);
  }

  /**
   * Sends a Solana asset on behalf of an end user with idempotency key.
   *
   * @param userId the end user ID
   * @param address the sender's Solana address
   * @param asset the asset to send (e.g. "usdc")
   * @param request the send asset request
   * @param idempotencyKey optional idempotency key
   * @return the transaction result
   * @throws ApiException if the API call fails
   */
  public SendSolanaTransactionWithEndUserAccount200Response sendSolanaAsset(
      String userId,
      String address,
      String asset,
      SendSolanaAssetWithEndUserAccountRequest request,
      String idempotencyKey)
      throws ApiException {
    String walletJwt =
        generateWalletJwt(
            "POST",
            "/v2/end-users/" + userId + "/solana/accounts/" + address + "/send/" + asset,
            request);
    return embeddedWalletsApi.sendSolanaAssetWithEndUserAccount(
        userId, address, asset, walletJwt, idempotencyKey, null, null, request);
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
