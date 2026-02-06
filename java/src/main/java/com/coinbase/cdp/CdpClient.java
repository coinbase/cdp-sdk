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
import com.coinbase.cdp.http.DelegatingHttpClientBuilder;
import com.coinbase.cdp.http.HttpClientConfig;
import com.coinbase.cdp.http.RetryConfig;
import com.coinbase.cdp.http.RetryingHttpClient;
import com.coinbase.cdp.openapi.ApiClient;
import com.coinbase.cdp.utils.CorrelationData;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.Closeable;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.time.Duration;
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
 * // Pattern 1: From environment variables
 * try (CdpClient cdp = CdpClient.create()) {
 *     EvmAccount account = cdp.evm().createAccount(
 *         CreateAccountOptions.builder()
 *             .name("my-account")
 *             .build()
 *     );
 * }
 *
 * // Pattern 2: With API key credentials
 * try (CdpClient cdp = CdpClient.builder()
 *         .credentials("api-key-id", "api-key-secret")
 *         .walletSecret("wallet-secret")
 *         .build()) {
 *     EvmAccount account = cdp.evm().createAccount(
 *         CreateAccountOptions.builder()
 *             .name("my-account")
 *             .build()
 *     );
 * }
 *
 * // Pattern 3: With pre-generated TokenProvider
 * try (CdpClient cdp = CdpClient.builder()
 *         .tokenProvider(myTokenProvider)
 *         .build()) {
 *     EvmAccount account = cdp.evm().createAccount(
 *         CreateAccountOptions.builder()
 *             .name("my-account")
 *             .build()
 *     );
 * }
 *
 * // Pattern 4: With HTTP configuration
 * try (CdpClient cdp = CdpClient.builder()
 *         .credentials("api-key-id", "api-key-secret")
 *         .httpConfig(config -> config
 *             .basePath("https://custom.api.com")
 *             .debugging(true))
 *         .build()) {
 *     // ...
 * }
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

  // Internal state - either options/tokenGenerator OR tokenProvider is set
  private final CdpClientOptions options;
  private final ApiClient apiClient;
  private final ObjectMapper objectMapper;
  private final CdpTokenGenerator tokenGenerator;
  private final TokenProvider tokenProvider;
  private volatile boolean closed = false;

  // Lazily initialized namespace clients
  private volatile EvmClient evmClient;
  private volatile SolanaClient solanaClient;
  private volatile PoliciesClient policiesClient;
  private final Object namespaceLock = new Object();

  // Package-private constructor for credential-based authentication (used by builder)
  CdpClient(CdpClientOptions options) {
    this.options = options;
    this.objectMapper = ApiClient.createDefaultObjectMapper();
    this.tokenGenerator =
        new CdpTokenGenerator(
            options.apiKeyId(),
            options.apiKeySecret(),
            options.walletSecret(),
            options.expiresIn());
    this.tokenProvider = null;
    this.apiClient = buildApiClient(options);
  }

  // Package-private constructor for TokenProvider-based authentication (used by builder)
  CdpClient(TokenProvider tokenProvider, HttpClientConfig config) {
    this.options = null;
    this.objectMapper = ApiClient.createDefaultObjectMapper();
    this.tokenGenerator = null;
    this.tokenProvider = tokenProvider;
    this.apiClient = buildApiClientWithTokens(tokenProvider, config);
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
   * Creates a new builder for CdpClient.
   *
   * <p>The builder supports two authentication modes:
   *
   * <ul>
   *   <li>Credentials - use {@code credentials(apiKeyId, apiKeySecret)} for automatic token
   *       generation
   *   <li>TokenProvider - use {@code tokenProvider(tokens)} for pre-generated tokens
   * </ul>
   *
   * <p>Example with credentials:
   *
   * <pre>{@code
   * CdpClient client = CdpClient.builder()
   *     .credentials("api-key-id", "api-key-secret")
   *     .walletSecret("wallet-secret")
   *     .build();
   * }</pre>
   *
   * <p>Example with TokenProvider:
   *
   * <pre>{@code
   * CdpClient client = CdpClient.builder()
   *     .tokenProvider(myTokenProvider)
   *     .httpConfig(config -> config.debugging(true))
   *     .build();
   * }</pre>
   *
   * @return a new builder instance
   */
  public static CdpClientBuilder builder() {
    return new CdpClientBuilder();
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
          if (tokenProvider != null) {
            evmClient = new EvmClient(apiClient, tokenProvider);
          } else {
            evmClient = new EvmClient(this);
          }
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
          if (tokenProvider != null) {
            solanaClient = new SolanaClient(apiClient, tokenProvider);
          } else {
            solanaClient = new SolanaClient(this);
          }
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
          if (tokenProvider != null) {
            policiesClient = new PoliciesClient(apiClient, tokenProvider);
          } else {
            policiesClient = new PoliciesClient(this);
          }
        }
      }
    }
    return policiesClient;
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

  // Internal method to build ApiClient for TokenProvider mode
  private static ApiClient buildApiClientWithTokens(TokenProvider tokens, HttpClientConfig config) {
    // Build retry config (use defaults if not specified)
    RetryConfig retryConfig = config.retryConfig().orElse(RetryConfig.defaultConfig());

    // Create base HttpClient using user-provided builder or default
    HttpClient.Builder baseBuilder = config.httpClientBuilder().orElseGet(HttpClient::newBuilder);

    // Apply default connect timeout
    baseBuilder.connectTimeout(Duration.ofSeconds(30));

    HttpClient baseClient = baseBuilder.build();

    // Wrap with retry functionality if retries > 0
    HttpClient httpClient =
        retryConfig.maxRetries() > 0
            ? new RetryingHttpClient(baseClient, retryConfig, config.debugging())
            : baseClient;

    // Create ApiClient with our wrapped HttpClient
    ApiClient client =
        new ApiClient(
            new DelegatingHttpClientBuilder(httpClient),
            ApiClient.createDefaultObjectMapper(),
            config.basePath());

    // Set request interceptor for auth headers
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
    String host = extractHost(options.basePath());

    // Build the retry configuration
    RetryConfig retryConfig =
        options
            .retryConfig()
            .orElseGet(() -> RetryConfig.withMaxRetries(options.maxNetworkRetries()));

    // Create the base HttpClient using user-provided builder or default
    HttpClient.Builder baseBuilder = options.httpClientBuilder().orElseGet(HttpClient::newBuilder);

    // Apply default connect timeout if not already set
    baseBuilder.connectTimeout(Duration.ofSeconds(30));

    HttpClient baseClient = baseBuilder.build();

    // Wrap with retry functionality if retries > 0
    HttpClient httpClient =
        retryConfig.maxRetries() > 0
            ? new RetryingHttpClient(baseClient, retryConfig, options.debugging())
            : baseClient;

    // Create ApiClient with our wrapped HttpClient
    ApiClient client =
        new ApiClient(
            new DelegatingHttpClientBuilder(httpClient),
            ApiClient.createDefaultObjectMapper(),
            options.basePath());

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
