package com.coinbase.cdp.client.enduser;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.auth.TokenProvider;
import com.coinbase.cdp.client.enduser.EndUserClientOptions.ImportEndUserOptions;
import com.coinbase.cdp.client.enduser.EndUserClientOptions.ListEndUsersOptions;
import com.coinbase.cdp.openapi.ApiClient;
import com.coinbase.cdp.openapi.ApiException;
import com.coinbase.cdp.openapi.api.EmbeddedWalletsCoreFunctionalityApi;
import com.coinbase.cdp.openapi.api.EndUserAccountsApi;
import com.coinbase.cdp.openapi.model.AddEndUserEvmAccount201Response;
import com.coinbase.cdp.openapi.model.AddEndUserEvmSmartAccount201Response;
import com.coinbase.cdp.openapi.model.AddEndUserEvmSmartAccountRequest;
import com.coinbase.cdp.openapi.model.AddEndUserSolanaAccount201Response;
import com.coinbase.cdp.openapi.model.CreateEndUserRequest;
import com.coinbase.cdp.openapi.model.CreateEvmEip7702Delegation201Response;
import com.coinbase.cdp.openapi.model.CreateEvmEip7702DelegationWithEndUserAccountRequest;
import com.coinbase.cdp.openapi.model.EndUser;
import com.coinbase.cdp.openapi.model.EvmUserOperation;
import com.coinbase.cdp.openapi.model.ImportEndUserRequest;
import com.coinbase.cdp.openapi.model.ListEndUsers200Response;
import com.coinbase.cdp.openapi.model.RevokeDelegationForEndUserRequest;
import com.coinbase.cdp.openapi.model.RevokeSpendPermissionRequest;
import com.coinbase.cdp.openapi.model.SendEvmAssetWithEndUserAccount200Response;
import com.coinbase.cdp.openapi.model.SendEvmAssetWithEndUserAccountRequest;
import com.coinbase.cdp.openapi.model.SendEvmTransaction200Response;
import com.coinbase.cdp.openapi.model.SendEvmTransactionWithEndUserAccountRequest;
import com.coinbase.cdp.openapi.model.SendSolanaAssetWithEndUserAccount200Response;
import com.coinbase.cdp.openapi.model.SendSolanaAssetWithEndUserAccountRequest;
import com.coinbase.cdp.openapi.model.SendSolanaTransaction200Response;
import com.coinbase.cdp.openapi.model.SendSolanaTransactionWithEndUserAccountRequest;
import com.coinbase.cdp.openapi.model.SendUserOperationWithEndUserAccountRequest;
import com.coinbase.cdp.openapi.model.SignEvmHash200Response;
import com.coinbase.cdp.openapi.model.SignEvmHashWithEndUserAccountRequest;
import com.coinbase.cdp.openapi.model.SignEvmMessage200Response;
import com.coinbase.cdp.openapi.model.SignEvmMessageWithEndUserAccountRequest;
import com.coinbase.cdp.openapi.model.SignEvmTransaction200Response;
import com.coinbase.cdp.openapi.model.SignEvmTransactionWithEndUserAccountRequest;
import com.coinbase.cdp.openapi.model.SignEvmTypedData200Response;
import com.coinbase.cdp.openapi.model.SignEvmTypedDataWithEndUserAccountRequest;
import com.coinbase.cdp.openapi.model.SignSolanaHashWithEndUserAccount200Response;
import com.coinbase.cdp.openapi.model.SignSolanaHashWithEndUserAccountRequest;
import com.coinbase.cdp.openapi.model.SignSolanaMessage200Response;
import com.coinbase.cdp.openapi.model.SignSolanaMessageWithEndUserAccountRequest;
import com.coinbase.cdp.openapi.model.SignSolanaTransaction200Response;
import com.coinbase.cdp.openapi.model.SignSolanaTransactionWithEndUserAccountRequest;
import com.coinbase.cdp.openapi.model.ValidateEndUserAccessTokenRequest;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import java.util.UUID;
import javax.crypto.Cipher;

/**
 * The namespace client for end user operations.
 *
 * <p>Provides high-level methods for creating, managing, and performing delegated operations on
 * behalf of end users. End users are entities that can own CDP EVM accounts, EVM smart accounts,
 * and/or Solana accounts.
 *
 * <p>Delegation operations (signing, sending) require a project ID to be configured.
 *
 * <p>Usage patterns:
 *
 * <pre>{@code
 * // Pattern 1: From environment variables (reads CDP_PROJECT_ID)
 * try (CdpClient cdp = CdpClient.create()) {
 *     EndUser endUser = cdp.endUser().createEndUser(
 *         new CreateEndUserRequest()
 *             .addAuthenticationMethodsItem(...)
 *     );
 * }
 *
 * // Pattern 2: With credentials and project ID
 * try (CdpClient cdp = CdpClient.builder()
 *         .credentials("api-key-id", "api-key-secret")
 *         .walletSecret("wallet-secret")
 *         .projectId("my-project-id")
 *         .build()) {
 *     EndUser endUser = cdp.endUser().createEndUser(
 *         new CreateEndUserRequest()
 *             .addAuthenticationMethodsItem(...)
 *     );
 * }
 * }</pre>
 */
public class EndUserClient {

  /** The public RSA key used to encrypt private keys when importing accounts. */
  private static final String IMPORT_ACCOUNT_PUBLIC_RSA_KEY =
      "-----BEGIN PUBLIC KEY-----\n"
          + "MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA2Fxydgm/ryYk0IexQIuL\n"
          + "9DKyiIk2WmS36AZ83a9Z0QX53qdveg08b05g1Qr+o+COoYOT/FDi8anRGAs7rIyS\n"
          + "uigrjHR6VrmFjnGrrTr3MINwC9cYQFHwET8YVGRq+BB3iFTB1kIb9XJ/vT2sk1xP\n"
          + "hJ6JihEwSl4DgbeVjqw59wYqrNg355oa8EdFqkmfGU2tpbM56F8iv1F+shwkGo3y\n"
          + "GhW/UOQ5OLauXvsqo8ranwsK+lqFblLEMlNtn1VSJeO2vMxryeKFrY2ob8VqGchC\n"
          + "ftPJiLWs2Du6juw4C1rOWwSMlXzZ6cNMHkxdTcEHMr3C2TEHgzjZY41whMwNTB8q\n"
          + "/pxXnIbH77caaviRs4R/POe8cSsznalXj85LULvFWOIHp0w+jEYSii9Rp9XtHWAH\n"
          + "nrK/O/SVDtT1ohp2F+Zg1mojTgKfLOyGdOUXTi95naDTuG770rSjHdL80tJBz1Fd\n"
          + "+1pzGTGXGHLZQLX5YZm5iuy2cebWfF09VjIoCIlDB2++tr4M+O0Z1X1ZE0J5Ackq\n"
          + "rOluAFalaKynyH3KMyRg+NuLmibu5OmcMjCLK3D4X1YLiN2OK8/bbpEL8JYroDwb\n"
          + "EXIUW5mGS06YxfSUsxHzL9Tj00+GMm/Gvl0+4/+Vn8IXVHjQOSPNEy3EnqCiH/OW\n"
          + "8v0IMC32CeGrX7mGbU+MzlsCAwEAAQ==\n"
          + "-----END PUBLIC KEY-----";

  private final CdpClient cdpClient;
  private final TokenProvider tokenProvider;
  private final String projectId;
  private final EndUserAccountsApi endUserAccountsApi;
  private final EmbeddedWalletsCoreFunctionalityApi embeddedWalletsApi;

  /**
   * Creates a new End User client for instance-based usage.
   *
   * @param cdpClient the parent CDP client
   */
  public EndUserClient(CdpClient cdpClient) {
    this.cdpClient = cdpClient;
    this.tokenProvider = null;
    this.projectId = cdpClient.getProjectId();
    ApiClient apiClient = cdpClient.getApiClient();
    this.endUserAccountsApi = new EndUserAccountsApi(apiClient);
    this.embeddedWalletsApi = new EmbeddedWalletsCoreFunctionalityApi(apiClient);
  }

  /**
   * Creates a new End User client for static factory usage with pre-generated tokens.
   *
   * @param apiClient the pre-configured API client with tokens
   * @param tokenProvider the token provider containing pre-generated tokens
   * @param projectId the CDP project ID (required for delegation operations)
   */
  public EndUserClient(ApiClient apiClient, TokenProvider tokenProvider, String projectId) {
    this.cdpClient = null;
    this.tokenProvider = tokenProvider;
    this.projectId = projectId;
    this.endUserAccountsApi = new EndUserAccountsApi(apiClient);
    this.embeddedWalletsApi = new EmbeddedWalletsCoreFunctionalityApi(apiClient);
  }

  // ==================== End User CRUD ====================

  /**
   * Creates a new end user with default options.
   *
   * @return the created end user
   * @throws ApiException if the API call fails
   */
  public EndUser createEndUser() throws ApiException {
    return createEndUser(new CreateEndUserRequest());
  }

  /**
   * Creates a new end user.
   *
   * @param request the end user creation request
   * @return the created end user
   * @throws ApiException if the API call fails
   */
  public EndUser createEndUser(CreateEndUserRequest request) throws ApiException {
    return createEndUser(request, null);
  }

  /**
   * Creates a new end user with idempotency key.
   *
   * @param request the end user creation request
   * @param idempotencyKey optional idempotency key
   * @return the created end user
   * @throws ApiException if the API call fails
   */
  public EndUser createEndUser(CreateEndUserRequest request, String idempotencyKey)
      throws ApiException {
    if (request.getUserId() == null || request.getUserId().isBlank()) {
      request.userId(UUID.randomUUID().toString());
    }
    String walletJwt = generateWalletJwt("POST", "/v2/end-users", request);
    return endUserAccountsApi.createEndUser(walletJwt, idempotencyKey, request);
  }

  /**
   * Gets an end user by their unique identifier.
   *
   * @param userId the unique identifier of the end user
   * @return the end user
   * @throws ApiException if the API call fails
   */
  public EndUser getEndUser(String userId) throws ApiException {
    return endUserAccountsApi.getEndUser(userId);
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
   * Validates an end user's access token. Throws an error if the access token is invalid.
   *
   * @param request the validation request containing the access token
   * @return the end user if the access token is valid
   * @throws ApiException if the API call fails or the token is invalid
   */
  public EndUser validateAccessToken(ValidateEndUserAccessTokenRequest request)
      throws ApiException {
    return endUserAccountsApi.validateEndUserAccessToken(request);
  }

  /**
   * Imports an existing private key for an end user.
   *
   * <p>The private key is encrypted with RSA-OAEP before being sent to the API.
   *
   * @param options the import options containing private key, key type, and authentication methods
   * @return the imported end user
   * @throws ApiException if the API call fails
   * @throws IllegalArgumentException if the private key format is invalid
   */
  public EndUser importEndUser(ImportEndUserOptions options) throws ApiException {
    return importEndUser(options, null);
  }

  /**
   * Imports an existing private key for an end user with idempotency key.
   *
   * <p>The private key is encrypted with RSA-OAEP before being sent to the API.
   *
   * @param options the import options containing private key, key type, and authentication methods
   * @param idempotencyKey optional idempotency key
   * @return the imported end user
   * @throws ApiException if the API call fails
   * @throws IllegalArgumentException if the private key format is invalid
   */
  public EndUser importEndUser(ImportEndUserOptions options, String idempotencyKey)
      throws ApiException {
    String userId = options.userId() != null ? options.userId() : UUID.randomUUID().toString();

    byte[] privateKeyBytes = decodePrivateKey(options.privateKey(), options.keyType());

    String encryptionKey =
        options.encryptionPublicKey() != null
            ? options.encryptionPublicKey()
            : IMPORT_ACCOUNT_PUBLIC_RSA_KEY;

    String encryptedPrivateKey = encryptWithRsa(privateKeyBytes, encryptionKey);

    ImportEndUserRequest request =
        new ImportEndUserRequest()
            .userId(userId)
            .authenticationMethods(options.authenticationMethods())
            .encryptedPrivateKey(encryptedPrivateKey)
            .keyType(ImportEndUserRequest.KeyTypeEnum.fromValue(options.keyType()));

    String walletJwt = generateWalletJwt("POST", "/v2/end-users/import", request);
    return endUserAccountsApi.importEndUser(walletJwt, idempotencyKey, request);
  }

  // ==================== Account Management ====================

  /**
   * Adds an EVM EOA (Externally Owned Account) to an existing end user. End users can have up to 10
   * EVM accounts.
   *
   * @param userId the unique identifier of the end user
   * @return the newly created EVM EOA account
   * @throws ApiException if the API call fails
   */
  public AddEndUserEvmAccount201Response addEvmAccount(String userId) throws ApiException {
    return addEvmAccount(userId, null);
  }

  /**
   * Adds an EVM EOA to an existing end user with idempotency key.
   *
   * @param userId the unique identifier of the end user
   * @param idempotencyKey optional idempotency key
   * @return the newly created EVM EOA account
   * @throws ApiException if the API call fails
   */
  public AddEndUserEvmAccount201Response addEvmAccount(String userId, String idempotencyKey)
      throws ApiException {
    String walletJwt = generateWalletJwt("POST", "/v2/end-users/" + userId + "/evm/accounts", null);
    return endUserAccountsApi.addEndUserEvmAccount(userId, walletJwt, idempotencyKey, null);
  }

  /**
   * Adds an EVM smart account to an existing end user. This also creates a new EVM EOA account to
   * serve as the owner of the smart account.
   *
   * @param userId the unique identifier of the end user
   * @param request the smart account creation request
   * @return the newly created EVM smart account
   * @throws ApiException if the API call fails
   */
  public AddEndUserEvmSmartAccount201Response addEvmSmartAccount(
      String userId, AddEndUserEvmSmartAccountRequest request) throws ApiException {
    return addEvmSmartAccount(userId, request, null);
  }

  /**
   * Adds an EVM smart account to an existing end user with idempotency key.
   *
   * @param userId the unique identifier of the end user
   * @param request the smart account creation request
   * @param idempotencyKey optional idempotency key
   * @return the newly created EVM smart account
   * @throws ApiException if the API call fails
   */
  public AddEndUserEvmSmartAccount201Response addEvmSmartAccount(
      String userId, AddEndUserEvmSmartAccountRequest request, String idempotencyKey)
      throws ApiException {
    String walletJwt =
        generateWalletJwt("POST", "/v2/end-users/" + userId + "/evm/smart-accounts", request);
    return endUserAccountsApi.addEndUserEvmSmartAccount(userId, walletJwt, idempotencyKey, request);
  }

  /**
   * Adds a Solana account to an existing end user. End users can have up to 10 Solana accounts.
   *
   * @param userId the unique identifier of the end user
   * @return the newly created Solana account
   * @throws ApiException if the API call fails
   */
  public AddEndUserSolanaAccount201Response addSolanaAccount(String userId) throws ApiException {
    return addSolanaAccount(userId, null);
  }

  /**
   * Adds a Solana account to an existing end user with idempotency key.
   *
   * @param userId the unique identifier of the end user
   * @param idempotencyKey optional idempotency key
   * @return the newly created Solana account
   * @throws ApiException if the API call fails
   */
  public AddEndUserSolanaAccount201Response addSolanaAccount(String userId, String idempotencyKey)
      throws ApiException {
    String walletJwt =
        generateWalletJwt("POST", "/v2/end-users/" + userId + "/solana/accounts", null);
    return endUserAccountsApi.addEndUserSolanaAccount(userId, walletJwt, idempotencyKey, null);
  }

  // ==================== Delegation Management ====================

  /**
   * Revokes all active delegations for the specified end user. This operation can be performed by
   * the end user themselves or by a developer using their API key.
   *
   * @param userId the unique identifier of the end user
   * @throws ApiException if the API call fails
   */
  public void revokeDelegation(String userId) throws ApiException {
    revokeDelegation(userId, null);
  }

  /**
   * Revokes all active delegations for the specified end user with idempotency key.
   *
   * @param userId the unique identifier of the end user
   * @param idempotencyKey optional idempotency key
   * @throws ApiException if the API call fails
   */
  public void revokeDelegation(String userId, String idempotencyKey) throws ApiException {
    String pid = requireProjectId();
    String walletJwt =
        generateWalletJwt(
            "POST",
            "/v2/embedded-wallet-api/projects/" + pid + "/end-users/" + userId + "/delegations",
            null);
    embeddedWalletsApi.revokeDelegationForEndUser(
        pid, userId, new RevokeDelegationForEndUserRequest(), walletJwt, null, idempotencyKey);
  }

  /**
   * Revokes a spend permission for an end user's smart account.
   *
   * @param userId the unique identifier of the end user
   * @param address the smart account address
   * @param request the revoke request
   * @return the user operation
   * @throws ApiException if the API call fails
   */
  public EvmUserOperation revokeSpendPermission(
      String userId, String address, RevokeSpendPermissionRequest request) throws ApiException {
    return revokeSpendPermission(userId, address, request, null);
  }

  /**
   * Revokes a spend permission for an end user's smart account with idempotency key.
   *
   * @param userId the unique identifier of the end user
   * @param address the smart account address
   * @param request the revoke request
   * @param idempotencyKey optional idempotency key
   * @return the user operation
   * @throws ApiException if the API call fails
   */
  public EvmUserOperation revokeSpendPermission(
      String userId, String address, RevokeSpendPermissionRequest request, String idempotencyKey)
      throws ApiException {
    String pid = requireProjectId();
    String walletJwt =
        generateWalletJwt(
            "POST",
            "/v2/embedded-wallet-api/projects/"
                + pid
                + "/end-users/"
                + userId
                + "/evm/smart-accounts/"
                + address
                + "/spend-permissions/revoke",
            request);
    return embeddedWalletsApi.revokeSpendPermissionWithEndUserAccount(
        pid, userId, address, request, walletJwt, idempotencyKey);
  }

  // ==================== Delegated EVM Sign Operations ====================

  /**
   * Signs an EVM hash on behalf of an end user using a delegation.
   *
   * @param userId the unique identifier of the end user
   * @param request the sign request containing hash and address
   * @return the signature response
   * @throws ApiException if the API call fails
   */
  public SignEvmHash200Response signEvmHash(
      String userId, SignEvmHashWithEndUserAccountRequest request) throws ApiException {
    return signEvmHash(userId, request, null);
  }

  /**
   * Signs an EVM hash on behalf of an end user with idempotency key.
   *
   * @param userId the unique identifier of the end user
   * @param request the sign request containing hash and address
   * @param idempotencyKey optional idempotency key
   * @return the signature response
   * @throws ApiException if the API call fails
   */
  public SignEvmHash200Response signEvmHash(
      String userId, SignEvmHashWithEndUserAccountRequest request, String idempotencyKey)
      throws ApiException {
    String pid = requireProjectId();
    String walletJwt =
        generateWalletJwt(
            "POST",
            "/v2/embedded-wallet-api/projects/" + pid + "/end-users/" + userId + "/evm/sign/hash",
            request);
    return embeddedWalletsApi.signEvmHashWithEndUserAccount(
        pid, userId, walletJwt, idempotencyKey, null, request);
  }

  /**
   * Signs an EVM transaction on behalf of an end user using a delegation.
   *
   * @param userId the unique identifier of the end user
   * @param request the sign request containing address and transaction
   * @return the signed transaction response
   * @throws ApiException if the API call fails
   */
  public SignEvmTransaction200Response signEvmTransaction(
      String userId, SignEvmTransactionWithEndUserAccountRequest request) throws ApiException {
    return signEvmTransaction(userId, request, null);
  }

  /**
   * Signs an EVM transaction on behalf of an end user with idempotency key.
   *
   * @param userId the unique identifier of the end user
   * @param request the sign request containing address and transaction
   * @param idempotencyKey optional idempotency key
   * @return the signed transaction response
   * @throws ApiException if the API call fails
   */
  public SignEvmTransaction200Response signEvmTransaction(
      String userId, SignEvmTransactionWithEndUserAccountRequest request, String idempotencyKey)
      throws ApiException {
    String pid = requireProjectId();
    String walletJwt =
        generateWalletJwt(
            "POST",
            "/v2/embedded-wallet-api/projects/"
                + pid
                + "/end-users/"
                + userId
                + "/evm/sign/transaction",
            request);
    return embeddedWalletsApi.signEvmTransactionWithEndUserAccount(
        pid, userId, walletJwt, idempotencyKey, null, request);
  }

  /**
   * Signs an EVM message (EIP-191) on behalf of an end user using a delegation.
   *
   * @param userId the unique identifier of the end user
   * @param request the sign request containing address and message
   * @return the signature response
   * @throws ApiException if the API call fails
   */
  public SignEvmMessage200Response signEvmMessage(
      String userId, SignEvmMessageWithEndUserAccountRequest request) throws ApiException {
    return signEvmMessage(userId, request, null);
  }

  /**
   * Signs an EVM message (EIP-191) on behalf of an end user with idempotency key.
   *
   * @param userId the unique identifier of the end user
   * @param request the sign request containing address and message
   * @param idempotencyKey optional idempotency key
   * @return the signature response
   * @throws ApiException if the API call fails
   */
  public SignEvmMessage200Response signEvmMessage(
      String userId, SignEvmMessageWithEndUserAccountRequest request, String idempotencyKey)
      throws ApiException {
    String pid = requireProjectId();
    String walletJwt =
        generateWalletJwt(
            "POST",
            "/v2/embedded-wallet-api/projects/"
                + pid
                + "/end-users/"
                + userId
                + "/evm/sign/message",
            request);
    return embeddedWalletsApi.signEvmMessageWithEndUserAccount(
        pid, userId, walletJwt, idempotencyKey, null, request);
  }

  /**
   * Signs EVM EIP-712 typed data on behalf of an end user using a delegation.
   *
   * @param userId the unique identifier of the end user
   * @param request the sign request containing address and typed data
   * @return the signature response
   * @throws ApiException if the API call fails
   */
  public SignEvmTypedData200Response signEvmTypedData(
      String userId, SignEvmTypedDataWithEndUserAccountRequest request) throws ApiException {
    return signEvmTypedData(userId, request, null);
  }

  /**
   * Signs EVM EIP-712 typed data on behalf of an end user with idempotency key.
   *
   * @param userId the unique identifier of the end user
   * @param request the sign request containing address and typed data
   * @param idempotencyKey optional idempotency key
   * @return the signature response
   * @throws ApiException if the API call fails
   */
  public SignEvmTypedData200Response signEvmTypedData(
      String userId, SignEvmTypedDataWithEndUserAccountRequest request, String idempotencyKey)
      throws ApiException {
    String pid = requireProjectId();
    String walletJwt =
        generateWalletJwt(
            "POST",
            "/v2/embedded-wallet-api/projects/"
                + pid
                + "/end-users/"
                + userId
                + "/evm/sign/typed-data",
            request);
    return embeddedWalletsApi.signEvmTypedDataWithEndUserAccount(
        pid, userId, walletJwt, idempotencyKey, null, request);
  }

  // ==================== Delegated EVM Send Operations ====================

  /**
   * Sends an EVM transaction on behalf of an end user using a delegation.
   *
   * @param userId the unique identifier of the end user
   * @param request the send request containing address, transaction, and network
   * @return the transaction response
   * @throws ApiException if the API call fails
   */
  public SendEvmTransaction200Response sendEvmTransaction(
      String userId, SendEvmTransactionWithEndUserAccountRequest request) throws ApiException {
    return sendEvmTransaction(userId, request, null);
  }

  /**
   * Sends an EVM transaction on behalf of an end user with idempotency key.
   *
   * @param userId the unique identifier of the end user
   * @param request the send request containing address, transaction, and network
   * @param idempotencyKey optional idempotency key
   * @return the transaction response
   * @throws ApiException if the API call fails
   */
  public SendEvmTransaction200Response sendEvmTransaction(
      String userId, SendEvmTransactionWithEndUserAccountRequest request, String idempotencyKey)
      throws ApiException {
    String pid = requireProjectId();
    String walletJwt =
        generateWalletJwt(
            "POST",
            "/v2/embedded-wallet-api/projects/"
                + pid
                + "/end-users/"
                + userId
                + "/evm/send/transaction",
            request);
    return embeddedWalletsApi.sendEvmTransactionWithEndUserAccount(
        pid, userId, walletJwt, idempotencyKey, null, request);
  }

  /**
   * Sends an EVM asset (e.g. USDC) on behalf of an end user using a delegation.
   *
   * @param userId the unique identifier of the end user
   * @param address the EVM address to send from
   * @param asset the asset to send (e.g., "usdc")
   * @param request the send request containing to, amount, network, and paymaster options
   * @return the send response
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
   * @param userId the unique identifier of the end user
   * @param address the EVM address to send from
   * @param asset the asset to send (e.g., "usdc")
   * @param request the send request containing to, amount, network, and paymaster options
   * @param idempotencyKey optional idempotency key
   * @return the send response
   * @throws ApiException if the API call fails
   */
  public SendEvmAssetWithEndUserAccount200Response sendEvmAsset(
      String userId,
      String address,
      String asset,
      SendEvmAssetWithEndUserAccountRequest request,
      String idempotencyKey)
      throws ApiException {
    String pid = requireProjectId();
    String walletJwt =
        generateWalletJwt(
            "POST",
            "/v2/embedded-wallet-api/projects/"
                + pid
                + "/end-users/"
                + userId
                + "/evm/"
                + address
                + "/send/"
                + asset,
            request);
    return embeddedWalletsApi.sendEvmAssetWithEndUserAccount(
        pid, userId, address, asset, walletJwt, idempotencyKey, null, request);
  }

  /**
   * Sends a user operation on behalf of an end user using a delegation.
   *
   * @param userId the unique identifier of the end user
   * @param address the EVM smart account address
   * @param request the user operation request containing network, calls, and paymaster options
   * @return the user operation result
   * @throws ApiException if the API call fails
   */
  public EvmUserOperation sendUserOperation(
      String userId, String address, SendUserOperationWithEndUserAccountRequest request)
      throws ApiException {
    return sendUserOperation(userId, address, request, null);
  }

  /**
   * Sends a user operation on behalf of an end user with idempotency key.
   *
   * @param userId the unique identifier of the end user
   * @param address the EVM smart account address
   * @param request the user operation request containing network, calls, and paymaster options
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
    String pid = requireProjectId();
    String walletJwt =
        generateWalletJwt(
            "POST",
            "/v2/embedded-wallet-api/projects/"
                + pid
                + "/end-users/"
                + userId
                + "/evm/smart-accounts/"
                + address
                + "/user-operations",
            request);
    return embeddedWalletsApi.sendUserOperationWithEndUserAccount(
        pid, userId, address, idempotencyKey, walletJwt, null, request);
  }

  // ==================== Delegated EVM EIP-7702 Delegation ====================

  /**
   * Creates an EVM EIP-7702 delegation on behalf of an end user.
   *
   * @param userId the unique identifier of the end user
   * @param request the delegation request containing address, network, and spend permission options
   * @return the delegation result
   * @throws ApiException if the API call fails
   */
  public CreateEvmEip7702Delegation201Response createEvmEip7702Delegation(
      String userId, CreateEvmEip7702DelegationWithEndUserAccountRequest request)
      throws ApiException {
    return createEvmEip7702Delegation(userId, request, null);
  }

  /**
   * Creates an EVM EIP-7702 delegation on behalf of an end user with idempotency key.
   *
   * @param userId the unique identifier of the end user
   * @param request the delegation request containing address, network, and spend permission options
   * @param idempotencyKey optional idempotency key
   * @return the delegation result
   * @throws ApiException if the API call fails
   */
  public CreateEvmEip7702Delegation201Response createEvmEip7702Delegation(
      String userId,
      CreateEvmEip7702DelegationWithEndUserAccountRequest request,
      String idempotencyKey)
      throws ApiException {
    String pid = requireProjectId();
    String walletJwt =
        generateWalletJwt(
            "POST",
            "/v2/embedded-wallet-api/projects/"
                + pid
                + "/end-users/"
                + userId
                + "/evm/eip7702/delegation",
            request);
    return embeddedWalletsApi.createEvmEip7702DelegationWithEndUserAccount(
        pid, userId, request, walletJwt, idempotencyKey, null);
  }

  // ==================== Delegated Solana Sign Operations ====================

  /**
   * Signs a Solana hash on behalf of an end user using a delegation.
   *
   * @param userId the unique identifier of the end user
   * @param request the sign request containing hash and address
   * @return the signature response
   * @throws ApiException if the API call fails
   */
  public SignSolanaHashWithEndUserAccount200Response signSolanaHash(
      String userId, SignSolanaHashWithEndUserAccountRequest request) throws ApiException {
    return signSolanaHash(userId, request, null);
  }

  /**
   * Signs a Solana hash on behalf of an end user with idempotency key.
   *
   * @param userId the unique identifier of the end user
   * @param request the sign request containing hash and address
   * @param idempotencyKey optional idempotency key
   * @return the signature response
   * @throws ApiException if the API call fails
   */
  public SignSolanaHashWithEndUserAccount200Response signSolanaHash(
      String userId, SignSolanaHashWithEndUserAccountRequest request, String idempotencyKey)
      throws ApiException {
    String pid = requireProjectId();
    String walletJwt =
        generateWalletJwt(
            "POST",
            "/v2/embedded-wallet-api/projects/"
                + pid
                + "/end-users/"
                + userId
                + "/solana/sign/hash",
            request);
    return embeddedWalletsApi.signSolanaHashWithEndUserAccount(
        pid, userId, walletJwt, idempotencyKey, null, request);
  }

  /**
   * Signs a Solana message on behalf of an end user using a delegation.
   *
   * @param userId the unique identifier of the end user
   * @param request the sign request containing address and message
   * @return the signature response
   * @throws ApiException if the API call fails
   */
  public SignSolanaMessage200Response signSolanaMessage(
      String userId, SignSolanaMessageWithEndUserAccountRequest request) throws ApiException {
    return signSolanaMessage(userId, request, null);
  }

  /**
   * Signs a Solana message on behalf of an end user with idempotency key.
   *
   * @param userId the unique identifier of the end user
   * @param request the sign request containing address and message
   * @param idempotencyKey optional idempotency key
   * @return the signature response
   * @throws ApiException if the API call fails
   */
  public SignSolanaMessage200Response signSolanaMessage(
      String userId, SignSolanaMessageWithEndUserAccountRequest request, String idempotencyKey)
      throws ApiException {
    String pid = requireProjectId();
    String walletJwt =
        generateWalletJwt(
            "POST",
            "/v2/embedded-wallet-api/projects/"
                + pid
                + "/end-users/"
                + userId
                + "/solana/sign/message",
            request);
    return embeddedWalletsApi.signSolanaMessageWithEndUserAccount(
        pid, userId, walletJwt, idempotencyKey, null, request);
  }

  /**
   * Signs a Solana transaction on behalf of an end user using a delegation.
   *
   * @param userId the unique identifier of the end user
   * @param request the sign request containing address and transaction
   * @return the signed transaction response
   * @throws ApiException if the API call fails
   */
  public SignSolanaTransaction200Response signSolanaTransaction(
      String userId, SignSolanaTransactionWithEndUserAccountRequest request) throws ApiException {
    return signSolanaTransaction(userId, request, null);
  }

  /**
   * Signs a Solana transaction on behalf of an end user with idempotency key.
   *
   * @param userId the unique identifier of the end user
   * @param request the sign request containing address and transaction
   * @param idempotencyKey optional idempotency key
   * @return the signed transaction response
   * @throws ApiException if the API call fails
   */
  public SignSolanaTransaction200Response signSolanaTransaction(
      String userId, SignSolanaTransactionWithEndUserAccountRequest request, String idempotencyKey)
      throws ApiException {
    String pid = requireProjectId();
    String walletJwt =
        generateWalletJwt(
            "POST",
            "/v2/embedded-wallet-api/projects/"
                + pid
                + "/end-users/"
                + userId
                + "/solana/sign/transaction",
            request);
    return embeddedWalletsApi.signSolanaTransactionWithEndUserAccount(
        pid, userId, walletJwt, idempotencyKey, null, request);
  }

  // ==================== Delegated Solana Send Operations ====================

  /**
   * Sends a Solana transaction on behalf of an end user using a delegation.
   *
   * @param userId the unique identifier of the end user
   * @param request the send request containing address, transaction, and network
   * @return the transaction response
   * @throws ApiException if the API call fails
   */
  public SendSolanaTransaction200Response sendSolanaTransaction(
      String userId, SendSolanaTransactionWithEndUserAccountRequest request) throws ApiException {
    return sendSolanaTransaction(userId, request, null);
  }

  /**
   * Sends a Solana transaction on behalf of an end user with idempotency key.
   *
   * @param userId the unique identifier of the end user
   * @param request the send request containing address, transaction, and network
   * @param idempotencyKey optional idempotency key
   * @return the transaction response
   * @throws ApiException if the API call fails
   */
  public SendSolanaTransaction200Response sendSolanaTransaction(
      String userId, SendSolanaTransactionWithEndUserAccountRequest request, String idempotencyKey)
      throws ApiException {
    String pid = requireProjectId();
    String walletJwt =
        generateWalletJwt(
            "POST",
            "/v2/embedded-wallet-api/projects/"
                + pid
                + "/end-users/"
                + userId
                + "/solana/send/transaction",
            request);
    return embeddedWalletsApi.sendSolanaTransactionWithEndUserAccount(
        pid, userId, walletJwt, idempotencyKey, null, request);
  }

  /**
   * Sends a Solana asset (e.g. USDC) on behalf of an end user using a delegation.
   *
   * @param userId the unique identifier of the end user
   * @param address the Solana address to send from
   * @param asset the asset to send (e.g., "usdc")
   * @param request the send request containing to, amount, network, and options
   * @return the send response
   * @throws ApiException if the API call fails
   */
  public SendSolanaAssetWithEndUserAccount200Response sendSolanaAsset(
      String userId, String address, String asset, SendSolanaAssetWithEndUserAccountRequest request)
      throws ApiException {
    return sendSolanaAsset(userId, address, asset, request, null);
  }

  /**
   * Sends a Solana asset on behalf of an end user with idempotency key.
   *
   * @param userId the unique identifier of the end user
   * @param address the Solana address to send from
   * @param asset the asset to send (e.g., "usdc")
   * @param request the send request containing to, amount, network, and options
   * @param idempotencyKey optional idempotency key
   * @return the send response
   * @throws ApiException if the API call fails
   */
  public SendSolanaAssetWithEndUserAccount200Response sendSolanaAsset(
      String userId,
      String address,
      String asset,
      SendSolanaAssetWithEndUserAccountRequest request,
      String idempotencyKey)
      throws ApiException {
    String pid = requireProjectId();
    String walletJwt =
        generateWalletJwt(
            "POST",
            "/v2/embedded-wallet-api/projects/"
                + pid
                + "/end-users/"
                + userId
                + "/solana/"
                + address
                + "/send/"
                + asset,
            request);
    return embeddedWalletsApi.sendSolanaAssetWithEndUserAccount(
        pid, userId, address, asset, walletJwt, idempotencyKey, null, request);
  }

  // ==================== Internal Helpers ====================

  /**
   * Returns the configured project ID or throws if not configured.
   *
   * @return the project ID
   * @throws IllegalStateException if project ID is not configured
   */
  private String requireProjectId() {
    if (projectId == null || projectId.isBlank()) {
      throw new IllegalStateException(
          "Missing required project ID for delegation operation. "
              + "Set the CDP_PROJECT_ID environment variable or pass projectId to the CdpClient builder.");
    }
    return projectId;
  }

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

  /**
   * Decodes a private key string to raw bytes based on the key type.
   *
   * @param privateKey the private key string
   * @param keyType "evm" or "solana"
   * @return the decoded private key bytes
   */
  private static byte[] decodePrivateKey(String privateKey, String keyType) {
    if ("evm".equals(keyType)) {
      String hex = privateKey.startsWith("0x") ? privateKey.substring(2) : privateKey;
      if (!hex.matches("[0-9a-fA-F]+")) {
        throw new IllegalArgumentException("EVM private key must be a valid hexadecimal string");
      }
      return hexToBytes(hex);
    } else if ("solana".equals(keyType)) {
      // Solana: base58 encoded string
      byte[] decoded = decodeBase58(privateKey);
      if (decoded.length != 32 && decoded.length != 64) {
        throw new IllegalArgumentException("Invalid Solana private key length");
      }
      // Truncate 64-byte keys to 32 bytes (seed only)
      if (decoded.length == 64) {
        byte[] seed = new byte[32];
        System.arraycopy(decoded, 0, seed, 0, 32);
        return seed;
      }
      return decoded;
    } else {
      throw new IllegalArgumentException("Unsupported key type: " + keyType);
    }
  }

  /**
   * Encrypts data with RSA-OAEP using SHA-256.
   *
   * @param data the data to encrypt
   * @param publicKeyPem the RSA public key in PEM format
   * @return the encrypted data as a base64 string
   */
  private static String encryptWithRsa(byte[] data, String publicKeyPem) {
    try {
      String keyContent =
          publicKeyPem
              .replace("-----BEGIN PUBLIC KEY-----", "")
              .replace("-----END PUBLIC KEY-----", "")
              .replaceAll("\\s+", "");

      byte[] keyBytes = Base64.getDecoder().decode(keyContent);
      X509EncodedKeySpec keySpec = new X509EncodedKeySpec(keyBytes);
      KeyFactory keyFactory = KeyFactory.getInstance("RSA");
      PublicKey publicKey = keyFactory.generatePublic(keySpec);

      Cipher cipher = Cipher.getInstance("RSA/ECB/OAEPWithSHA-256AndMGF1Padding");
      cipher.init(Cipher.ENCRYPT_MODE, publicKey);

      byte[] encrypted = cipher.doFinal(data);
      return Base64.getEncoder().encodeToString(encrypted);
    } catch (Exception e) {
      throw new RuntimeException("Failed to encrypt private key with RSA", e);
    }
  }

  /**
   * Converts a hex string to a byte array.
   *
   * @param hex the hex string (without 0x prefix)
   * @return the byte array
   */
  private static byte[] hexToBytes(String hex) {
    int len = hex.length();
    byte[] data = new byte[len / 2];
    for (int i = 0; i < len; i += 2) {
      data[i / 2] =
          (byte)
              ((Character.digit(hex.charAt(i), 16) << 4) + Character.digit(hex.charAt(i + 1), 16));
    }
    return data;
  }

  /**
   * Decodes a base58-encoded string to bytes.
   *
   * @param input the base58 string
   * @return the decoded bytes
   */
  private static byte[] decodeBase58(String input) {
    String alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

    java.math.BigInteger result = java.math.BigInteger.ZERO;
    java.math.BigInteger base = java.math.BigInteger.valueOf(58);

    for (int i = 0; i < input.length(); i++) {
      int digit = alphabet.indexOf(input.charAt(i));
      if (digit < 0) {
        throw new IllegalArgumentException("Invalid base58 character: " + input.charAt(i));
      }
      result = result.multiply(base).add(java.math.BigInteger.valueOf(digit));
    }

    // Count leading zeros (1's in base58)
    int leadingZeros = 0;
    for (int i = 0; i < input.length() && input.charAt(i) == '1'; i++) {
      leadingZeros++;
    }

    byte[] decoded = result.toByteArray();
    // Remove the leading zero byte that BigInteger may add for sign
    boolean stripSignByte = decoded.length > 1 && decoded[0] == 0;
    int stripOffset = stripSignByte ? 1 : 0;

    byte[] output = new byte[leadingZeros + decoded.length - stripOffset];
    System.arraycopy(decoded, stripOffset, output, leadingZeros, decoded.length - stripOffset);

    return output;
  }
}
