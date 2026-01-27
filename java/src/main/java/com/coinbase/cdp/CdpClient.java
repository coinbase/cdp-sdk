package com.coinbase.cdp;

import com.coinbase.cdp.auth.CdpTokenGenerator;
import com.coinbase.cdp.auth.CdpTokenRequest;
import com.coinbase.cdp.auth.CdpTokenResponse;
import com.coinbase.cdp.auth.JwtGenerator;
import com.coinbase.cdp.auth.JwtOptions;
import com.coinbase.cdp.auth.TokenProvider;
import com.coinbase.cdp.auth.WalletJwtGenerator;
import com.coinbase.cdp.auth.WalletJwtOptions;
import com.coinbase.cdp.client.evm.EvmClient;
import com.coinbase.cdp.client.policies.PoliciesClient;
import com.coinbase.cdp.client.solana.SolanaClient;
import com.coinbase.cdp.errors.ValidationException;
import com.coinbase.cdp.openapi.ApiClient;
import com.coinbase.cdp.utils.CorrelationData;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.Closeable;
import java.net.URI;
import java.net.http.HttpRequest;
import java.util.Map;

/**
 * The main client for interacting with the CDP API.
 *
 * <p>The CdpClient is namespaced by chain type and functionality:
 *
 * <ul>
 *   <li>{@code cdp.evm()} - EVM account operations
 *   <li>{@code cdp.solana()} - Solana account operations
 *   <li>{@code cdp.policies()} - Policy management
 * </ul>
 *
 * <p>Example usage:
 *
 * <pre>{@code
 * // Pattern 1: Instance-based (automatic token generation)
 * try (CdpClient cdp = CdpClient.create()) {
 *     // Create an EVM account
 *     EvmAccount account = cdp.evm().createAccount(
 *         CreateAccountOptions.builder()
 *             .name("my-account")
 *             .build()
 *     );
 *
 *     // Create a Solana account
 *     SolanaAccount solAccount = cdp.solana().createAccount();
 *
 *     // Create a policy
 *     Policy policy = cdp.policies().createPolicy(
 *         CreatePolicyOptions.builder()
 *             .policy(policyRequest)
 *             .build()
 *     );
 * }
 *
 * // Pattern 2: Static factory with pre-generated tokens
 * CdpTokenResponse tokens = tokenGenerator.generateTokens(request);
 * EvmAccount account = CdpClient.evm(tokens).createAccount(
 *     CreateAccountOptions.builder()
 *         .name("my-account")
 *         .build()
 * );
 * }</pre>
 *
 * <p>For low-level access, you can still use the generated OpenAPI API classes directly:
 *
 * <pre>{@code
 * try (CdpClient cdp = CdpClient.create()) {
 *     EvmAccountsApi evmApi = new EvmAccountsApi(cdp.getApiClient());
 *     var accounts = evmApi.listEvmAccounts(null, null);
 * }
 * }</pre>
 */
public class CdpClient implements Closeable {

  /** The current SDK version. */
  public static final String SDK_VERSION = "0.1.0";

  /** The SDK language identifier. */
  public static final String SDK_LANGUAGE = "java";

  private final CdpClientOptions options;
  private final ApiClient apiClient;
  private final ObjectMapper objectMapper;
  private final CdpTokenGenerator tokenGenerator;
  private volatile boolean closed = false;

  // Lazily initialized namespace clients
  private volatile EvmClient evmClient;
  private volatile SolanaClient solanaClient;
  private volatile PoliciesClient policiesClient;
  private final Object namespaceLock = new Object();

  private CdpClient(CdpClientOptions options) {
    this.options = options;
    this.objectMapper = ApiClient.createDefaultObjectMapper();
    this.tokenGenerator =
        new CdpTokenGenerator(
            options.apiKeyId(),
            options.apiKeySecret(),
            options.walletSecret(),
            options.expiresIn());
    this.apiClient = buildApiClient(options);
  }

  /**
   * Creates a new CDP client from environment variables.
   *
   * <p>Reads configuration from:
   *
   * <ul>
   *   <li>{@code CDP_API_KEY_ID} - Required
   *   <li>{@code CDP_API_KEY_SECRET} - Required
   *   <li>{@code CDP_WALLET_SECRET} - Optional (required for write operations)
   * </ul>
   *
   * @return a new CDP client
   * @throws IllegalArgumentException if required environment variables are missing
   */
  public static CdpClient create() {
    return create(CdpClientOptions.fromEnvironment());
  }

  /**
   * Creates a new CDP client with the given options.
   *
   * @param options the client configuration options
   * @return a new CDP client
   */
  public static CdpClient create(CdpClientOptions options) {
    return new CdpClient(options);
  }

  /**
   * Returns the configured {@link ApiClient} for use with generated API classes.
   *
   * <p>The returned client is pre-configured with:
   *
   * <ul>
   *   <li>JWT authentication via request interceptor
   *   <li>Correlation context headers for request tracking
   *   <li>Proper base URL configuration
   * </ul>
   *
   * <p>Use this client to instantiate generated API classes:
   *
   * <pre>{@code
   * EvmAccountsApi evmApi = new EvmAccountsApi(cdp.getApiClient());
   * SolanaAccountsApi solanaApi = new SolanaAccountsApi(cdp.getApiClient());
   * PolicyEngineApi policiesApi = new PolicyEngineApi(cdp.getApiClient());
   * }</pre>
   *
   * @return the configured API client
   * @throws IllegalStateException if the client has been closed
   */
  public ApiClient getApiClient() {
    checkNotClosed();
    return apiClient;
  }

  // ==================== Instance Methods (internal token generation) ====================

  /**
   * Returns the EVM namespace client with automatic token generation.
   *
   * <p>Use this client for EVM account operations:
   *
   * <pre>{@code
   * EvmAccount account = cdp.evm().createAccount(
   *     CreateAccountOptions.builder().name("my-account").build()
   * );
   * }</pre>
   *
   * @return the EVM client
   * @throws IllegalStateException if the client has been closed
   */
  public EvmClient evm() {
    checkNotClosed();
    if (evmClient == null) {
      synchronized (namespaceLock) {
        if (evmClient == null) {
          evmClient = new EvmClient(this);
        }
      }
    }
    return evmClient;
  }

  /**
   * Returns the Solana namespace client with automatic token generation.
   *
   * <p>Use this client for Solana account operations:
   *
   * <pre>{@code
   * SolanaAccount account = cdp.solana().createAccount(
   *     CreateAccountOptions.builder().name("my-account").build()
   * );
   * }</pre>
   *
   * @return the Solana client
   * @throws IllegalStateException if the client has been closed
   */
  public SolanaClient solana() {
    checkNotClosed();
    if (solanaClient == null) {
      synchronized (namespaceLock) {
        if (solanaClient == null) {
          solanaClient = new SolanaClient(this);
        }
      }
    }
    return solanaClient;
  }

  /**
   * Returns the Policies namespace client.
   *
   * <p>Use this client for policy operations:
   *
   * <pre>{@code
   * Policy policy = cdp.policies().createPolicy(
   *     CreatePolicyOptions.builder().policy(policyRequest).build()
   * );
   * }</pre>
   *
   * @return the Policies client
   * @throws IllegalStateException if the client has been closed
   */
  public PoliciesClient policies() {
    checkNotClosed();
    if (policiesClient == null) {
      synchronized (namespaceLock) {
        if (policiesClient == null) {
          policiesClient = new PoliciesClient(this);
        }
      }
    }
    return policiesClient;
  }

  // ==================== Static Factory Methods (pre-generated tokens) ====================

  /**
   * Creates an EVM client using pre-generated tokens.
   *
   * <p>Use this when tokens are generated externally (e.g., from a separate auth service):
   *
   * <pre>{@code
   * // Using CdpTokenResponse
   * CdpTokenResponse tokens = tokenGenerator.generateTokens(request);
   * EvmAccount account = CdpClient.evm(tokens).createAccount(
   *     CreateAccountOptions.builder().name("my-account").build()
   * );
   *
   * // Using custom TokenProvider implementation
   * TokenProvider customTokens = new MyCustomTokenProvider();
   * EvmAccount account = CdpClient.evm(customTokens).createAccount(
   *     CreateAccountOptions.builder().name("my-account").build()
   * );
   * }</pre>
   *
   * @param tokens the pre-generated tokens
   * @return a new EVM client
   */
  public static EvmClient evm(TokenProvider tokens) {
    return evm(tokens, CdpClientOptions.DEFAULT_BASE_PATH);
  }

  /**
   * Creates an EVM client using pre-generated tokens with a custom base path.
   *
   * @param tokens the pre-generated tokens
   * @param basePath the API base path
   * @return a new EVM client
   */
  public static EvmClient evm(TokenProvider tokens, String basePath) {
    ApiClient apiClient = createApiClientWithTokens(tokens, basePath);
    return new EvmClient(apiClient, tokens);
  }

  /**
   * Creates a Solana client using pre-generated tokens.
   *
   * <p>Use this when tokens are generated externally (e.g., from a separate auth service):
   *
   * <pre>{@code
   * // Using CdpTokenResponse
   * CdpTokenResponse tokens = tokenGenerator.generateTokens(request);
   * SolanaAccount account = CdpClient.solana(tokens).createAccount(
   *     CreateAccountOptions.builder().name("my-account").build()
   * );
   *
   * // Using custom TokenProvider implementation
   * TokenProvider customTokens = new MyCustomTokenProvider();
   * SolanaAccount account = CdpClient.solana(customTokens).createAccount(
   *     CreateAccountOptions.builder().name("my-account").build()
   * );
   * }</pre>
   *
   * @param tokens the pre-generated tokens
   * @return a new Solana client
   */
  public static SolanaClient solana(TokenProvider tokens) {
    return solana(tokens, CdpClientOptions.DEFAULT_BASE_PATH);
  }

  /**
   * Creates a Solana client using pre-generated tokens with a custom base path.
   *
   * @param tokens the pre-generated tokens
   * @param basePath the API base path
   * @return a new Solana client
   */
  public static SolanaClient solana(TokenProvider tokens, String basePath) {
    ApiClient apiClient = createApiClientWithTokens(tokens, basePath);
    return new SolanaClient(apiClient, tokens);
  }

  /**
   * Creates a Policies client using pre-generated tokens.
   *
   * <p>Use this when tokens are generated externally (e.g., from a separate auth service):
   *
   * <pre>{@code
   * // Using CdpTokenResponse
   * CdpTokenResponse tokens = tokenGenerator.generateTokens(request);
   * Policy policy = CdpClient.policies(tokens).createPolicy(
   *     CreatePolicyOptions.builder().policy(policyRequest).build()
   * );
   *
   * // Using custom TokenProvider implementation
   * TokenProvider customTokens = new MyCustomTokenProvider();
   * Policy policy = CdpClient.policies(customTokens).createPolicy(
   *     CreatePolicyOptions.builder().policy(policyRequest).build()
   * );
   * }</pre>
   *
   * @param tokens the pre-generated tokens
   * @return a new Policies client
   */
  public static PoliciesClient policies(TokenProvider tokens) {
    return policies(tokens, CdpClientOptions.DEFAULT_BASE_PATH);
  }

  /**
   * Creates a Policies client using pre-generated tokens with a custom base path.
   *
   * @param tokens the pre-generated tokens
   * @param basePath the API base path
   * @return a new Policies client
   */
  public static PoliciesClient policies(TokenProvider tokens, String basePath) {
    ApiClient apiClient = createApiClientWithTokens(tokens, basePath);
    return new PoliciesClient(apiClient, tokens);
  }

  /**
   * Generates a wallet JWT for write operations that require the X-Wallet-Auth header.
   *
   * <p>Write operations (POST, PUT, DELETE) on account endpoints require a wallet JWT that includes
   * a hash of the request body. This method generates the appropriate JWT.
   *
   * <p>Example:
   *
   * <pre>{@code
   * var request = new CreateEvmAccountRequest().name("my-account");
   * String walletJwt = cdp.generateWalletJwt("POST", "/v2/evm/accounts", request);
   * EvmAccount account = evmApi.createEvmAccount(walletJwt, null, request);
   * }</pre>
   *
   * @param method the HTTP method (POST, PUT, DELETE)
   * @param path the API path (e.g., "/v2/evm/accounts")
   * @param requestBody the request body object (will be serialized and hashed)
   * @return the wallet JWT string
   * @throws ValidationException if wallet secret is not configured
   * @throws IllegalStateException if the client has been closed
   */
  public String generateWalletJwt(String method, String path, Object requestBody) {
    checkNotClosed();

    if (options.walletSecret().isEmpty()) {
      throw new ValidationException(
          "Wallet secret is required for write operations. "
              + "Set CDP_WALLET_SECRET environment variable or pass walletSecret in options.");
    }

    Map<String, Object> bodyMap = convertToMap(requestBody);
    String host = extractHost(options.basePath());

    return WalletJwtGenerator.generateWalletJwt(
        new WalletJwtOptions(options.walletSecret().get(), method, host, path, bodyMap));
  }

  /**
   * Returns the client options.
   *
   * @return the client options
   */
  public CdpClientOptions options() {
    return options;
  }

  /**
   * Generates authentication tokens using the unified token API.
   *
   * <p>This method provides a single entry point for generating both bearer tokens and optional
   * wallet auth tokens based on the request configuration.
   *
   * <p>Example:
   *
   * <pre>{@code
   * CdpTokenRequest request = CdpTokenRequest.builder()
   *     .requestMethod("POST")
   *     .requestPath("/v2/evm/accounts")
   *     .includeWalletAuthToken(true)
   *     .requestBody(Map.of("name", "my-account"))
   *     .build();
   *
   * CdpTokenResponse tokens = cdp.generateTokens(request);
   * // tokens.bearerToken() - for Authorization header
   * // tokens.walletAuthToken() - for X-Wallet-Auth header
   * }</pre>
   *
   * @param request the token request configuration
   * @return the generated tokens
   * @throws com.coinbase.cdp.auth.exceptions.WalletSecretException if wallet auth is requested but
   *     no wallet secret is configured
   * @throws IllegalStateException if the client has been closed
   */
  public CdpTokenResponse generateTokens(CdpTokenRequest request) {
    checkNotClosed();
    return tokenGenerator.generateTokens(request);
  }

  /**
   * Returns the token generator for advanced usage.
   *
   * <p>The token generator can be used independently to generate tokens for use with external
   * systems or custom authentication flows.
   *
   * @return the token generator
   * @throws IllegalStateException if the client has been closed
   */
  public CdpTokenGenerator getTokenGenerator() {
    checkNotClosed();
    return tokenGenerator;
  }

  /**
   * Creates an ApiClient configured to use pre-generated tokens.
   *
   * <p>This factory method allows constructing an ApiClient that uses externally generated tokens
   * rather than auto-generating them via the request interceptor. This is useful for environments
   * where token generation happens in a separate service or process.
   *
   * <p>Accepts any implementation of {@link TokenProvider}, allowing for flexible token sourcing
   * from custom authentication systems, external services, or alternative token generators.
   *
   * <p>Example:
   *
   * <pre>{@code
   * // Using CdpTokenResponse
   * CdpTokenResponse tokens = externalGenerator.generateTokens(request);
   * ApiClient apiClient = CdpClient.createApiClientWithTokens(tokens);
   *
   * // Using custom TokenProvider
   * TokenProvider customTokens = new MyCustomTokenProvider();
   * ApiClient apiClient = CdpClient.createApiClientWithTokens(customTokens);
   *
   * // Use API directly
   * EvmAccountsApi evmApi = new EvmAccountsApi(apiClient);
   * }</pre>
   *
   * @param tokens the pre-generated tokens
   * @return a configured ApiClient
   */
  public static ApiClient createApiClientWithTokens(TokenProvider tokens) {
    return createApiClientWithTokens(tokens, CdpClientOptions.DEFAULT_BASE_PATH);
  }

  /**
   * Creates an ApiClient configured to use pre-generated tokens with a custom base path.
   *
   * @param tokens the pre-generated tokens
   * @param basePath the API base path
   * @return a configured ApiClient
   */
  public static ApiClient createApiClientWithTokens(TokenProvider tokens, String basePath) {
    ApiClient client = new ApiClient();
    client.updateBaseUri(basePath);

    client.setRequestInterceptor(
        builder -> {
          builder.header("Authorization", "Bearer " + tokens.bearerToken());
          builder.header("Correlation-Context", CorrelationData.build(SDK_VERSION, SDK_LANGUAGE));
          // Note: X-Wallet-Auth is NOT set here because it's handled by the namespace client
          // methods (EvmClient, SolanaClient) which pass the wallet JWT from TokenProvider
          // directly to the OpenAPI method parameters. Adding it here would result in
          // duplicate headers.
        });

    return client;
  }

  /**
   * Closes the client.
   *
   * <p>After closing, any attempt to use the client will throw {@link IllegalStateException}. Note
   * that the underlying HttpClient does not require explicit cleanup in Java 11+.
   */
  @Override
  public void close() {
    closed = true;
  }

  private void checkNotClosed() {
    if (closed) {
      throw new IllegalStateException(
          "Cannot use a closed CDP client. Please create a new client instance.");
    }
  }

  private ApiClient buildApiClient(CdpClientOptions options) {
    ApiClient client = new ApiClient();
    client.updateBaseUri(options.basePath());
    String host = extractHost(options.basePath());

    // Set request interceptor to add auth headers
    client.setRequestInterceptor(
        builder -> {
          // Build a temporary request to extract URI and method
          // This is needed because HttpRequest.Builder doesn't expose getters
          HttpRequest tempRequest = builder.build();
          String method = tempRequest.method();
          String path = tempRequest.uri().getPath();

          // Generate API key JWT with URI claims for REST API authentication
          String jwt =
              JwtGenerator.generateJwt(
                  JwtOptions.builder(options.apiKeyId(), options.apiKeySecret())
                      .requestMethod(method)
                      .requestHost(host)
                      .requestPath(path)
                      .build());

          builder.header("Authorization", "Bearer " + jwt);
          builder.header("Correlation-Context", CorrelationData.build(SDK_VERSION, SDK_LANGUAGE));
        });

    return client;
  }

  private String extractHost(String basePath) {
    try {
      URI uri = URI.create(basePath);
      return uri.getHost();
    } catch (Exception e) {
      return "api.cdp.coinbase.com";
    }
  }

  @SuppressWarnings("unchecked")
  private Map<String, Object> convertToMap(Object obj) {
    if (obj == null) {
      return null;
    }
    if (obj instanceof Map) {
      return (Map<String, Object>) obj;
    }

    // Use Jackson ObjectMapper to convert POJO to Map
    return objectMapper.convertValue(obj, new TypeReference<Map<String, Object>>() {});
  }
}
