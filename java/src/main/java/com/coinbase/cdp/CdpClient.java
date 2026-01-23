package com.coinbase.cdp;

import com.coinbase.cdp.auth.JwtGenerator;
import com.coinbase.cdp.auth.JwtOptions;
import com.coinbase.cdp.auth.WalletJwtGenerator;
import com.coinbase.cdp.auth.WalletJwtOptions;
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
 * Factory for creating a configured {@link ApiClient} to interact with the CDP API.
 *
 * <p>This class provides the entry point for using the CDP SDK. It creates an {@link ApiClient}
 * that is pre-configured with JWT authentication headers. Use the generated OpenAPI API classes
 * directly with the configured client.
 *
 * <p>Example usage:
 *
 * <pre>{@code
 * // Create from environment variables
 * try (CdpClient cdp = CdpClient.create()) {
 *     ApiClient apiClient = cdp.getApiClient();
 *
 *     // Use generated API classes directly
 *     EvmAccountsApi evmApi = new EvmAccountsApi(apiClient);
 *
 *     // Read operations
 *     var accounts = evmApi.listEvmAccounts(null, null, null);
 *
 *     // Write operations - generate wallet JWT for X-Wallet-Auth header
 *     var request = new CreateEvmAccountRequest().name("my-account");
 *     String walletJwt = cdp.generateWalletJwt("POST", "/v2/evm/accounts", request);
 *     EvmAccount account = evmApi.createEvmAccount(walletJwt, null, request);
 * }
 *
 * // Or with explicit configuration
 * CdpClientOptions options = CdpClientOptions.builder()
 *     .apiKeyId("your-api-key-id")
 *     .apiKeySecret("your-api-key-secret")
 *     .walletSecret("your-wallet-secret")
 *     .build();
 *
 * try (CdpClient cdp = CdpClient.create(options)) {
 *     EvmAccountsApi evmApi = new EvmAccountsApi(cdp.getApiClient());
 *     // ... use API
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
  private volatile boolean closed = false;

  private CdpClient(CdpClientOptions options) {
    this.options = options;
    this.objectMapper = ApiClient.createDefaultObjectMapper();
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
