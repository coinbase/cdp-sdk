package com.coinbase.cdp;

import com.coinbase.cdp.http.RetryConfig;
import java.net.http.HttpClient;
import java.util.Optional;

/**
 * Configuration options for the CDP client.
 *
 * <p>Example usage:
 *
 * <pre>{@code
 * // From environment variables
 * CdpClientOptions options = CdpClientOptions.fromEnvironment();
 *
 * // With explicit configuration
 * CdpClientOptions options = CdpClientOptions.builder()
 *     .apiKeyId("your-api-key-id")
 *     .apiKeySecret("your-api-key-secret")
 *     .walletSecret("your-wallet-secret")
 *     .debugging(true)
 *     .build();
 * }</pre>
 */
public record CdpClientOptions(
    String apiKeyId,
    String apiKeySecret,
    Optional<String> walletSecret,
    boolean debugging,
    String basePath,
    long expiresIn,
    int maxNetworkRetries,
    Optional<RetryConfig> retryConfig,
    Optional<HttpClient.Builder> httpClientBuilder) {

  /** Default base URL for the CDP API. */
  public static final String DEFAULT_BASE_PATH = "https://api.cdp.coinbase.com/platform";

  /** Default JWT expiration time in seconds. */
  public static final long DEFAULT_EXPIRES_IN = 120L;

  /** Default maximum number of network retries. */
  public static final int DEFAULT_MAX_RETRIES = 3;

  /**
   * Validates the client options.
   *
   * @throws IllegalArgumentException if validation fails
   */
  public CdpClientOptions {
    if (apiKeyId == null || apiKeyId.isBlank()) {
      throw new IllegalArgumentException("apiKeyId is required");
    }
    if (apiKeySecret == null || apiKeySecret.isBlank()) {
      throw new IllegalArgumentException("apiKeySecret is required");
    }
    if (walletSecret == null) {
      walletSecret = Optional.empty();
    }
    if (basePath == null || basePath.isBlank()) {
      basePath = DEFAULT_BASE_PATH;
    }
    if (expiresIn <= 0) {
      expiresIn = DEFAULT_EXPIRES_IN;
    }
    if (maxNetworkRetries < 0) {
      maxNetworkRetries = DEFAULT_MAX_RETRIES;
    }
    if (retryConfig == null) {
      retryConfig = Optional.empty();
    }
    if (httpClientBuilder == null) {
      httpClientBuilder = Optional.empty();
    }
  }

  /**
   * Creates a new builder for CdpClientOptions.
   *
   * @return a new builder instance
   */
  public static Builder builder() {
    return new Builder();
  }

  /**
   * Creates options from environment variables.
   *
   * <p>Reads from:
   *
   * <ul>
   *   <li>{@code CDP_API_KEY_ID} - Required
   *   <li>{@code CDP_API_KEY_SECRET} - Required
   *   <li>{@code CDP_WALLET_SECRET} - Optional
   * </ul>
   *
   * @return the client options
   * @throws IllegalArgumentException if required environment variables are missing
   */
  public static CdpClientOptions fromEnvironment() {
    String apiKeyId = getEnvOrProperty("CDP_API_KEY_ID");
    String apiKeySecret = getEnvOrProperty("CDP_API_KEY_SECRET");
    String walletSecret = getEnvOrProperty("CDP_WALLET_SECRET");

    if (apiKeyId == null || apiKeyId.isBlank()) {
      throw new IllegalArgumentException("CDP_API_KEY_ID environment variable is required");
    }
    if (apiKeySecret == null || apiKeySecret.isBlank()) {
      throw new IllegalArgumentException("CDP_API_KEY_SECRET environment variable is required");
    }

    return builder()
        .apiKeyId(apiKeyId)
        .apiKeySecret(apiKeySecret)
        .walletSecret(walletSecret)
        .build();
  }

  /**
   * Gets a value from environment variables or system properties.
   *
   * <p>Environment variables take precedence over system properties.
   *
   * @param name the name of the variable
   * @return the value, or null if not found
   */
  private static String getEnvOrProperty(String name) {
    String value = System.getenv(name);
    if (value == null || value.isBlank()) {
      value = System.getProperty(name);
    }
    return value;
  }

  /** Builder for CdpClientOptions. */
  public static class Builder {
    private String apiKeyId;
    private String apiKeySecret;
    private Optional<String> walletSecret = Optional.empty();
    private boolean debugging = false;
    private String basePath = DEFAULT_BASE_PATH;
    private long expiresIn = DEFAULT_EXPIRES_IN;
    private int maxNetworkRetries = DEFAULT_MAX_RETRIES;
    private Optional<RetryConfig> retryConfig = Optional.empty();
    private Optional<HttpClient.Builder> httpClientBuilder = Optional.empty();

    /**
     * Sets the API key ID.
     *
     * @param id the API key ID
     * @return this builder
     */
    public Builder apiKeyId(String id) {
      this.apiKeyId = id;
      return this;
    }

    /**
     * Sets the API key secret.
     *
     * @param secret the API key secret (PEM EC key or base64 Ed25519 key)
     * @return this builder
     */
    public Builder apiKeySecret(String secret) {
      this.apiKeySecret = secret;
      return this;
    }

    /**
     * Sets the wallet secret.
     *
     * @param secret the wallet secret (base64 DER-encoded EC key)
     * @return this builder
     */
    public Builder walletSecret(String secret) {
      this.walletSecret = Optional.ofNullable(secret).filter(s -> !s.isBlank());
      return this;
    }

    /**
     * Sets whether to enable debug logging.
     *
     * @param debug true to enable debug logging
     * @return this builder
     */
    public Builder debugging(boolean debug) {
      this.debugging = debug;
      return this;
    }

    /**
     * Sets the base URL for the API.
     *
     * @param path the base URL
     * @return this builder
     */
    public Builder basePath(String path) {
      this.basePath = path;
      return this;
    }

    /**
     * Sets the JWT expiration time in seconds.
     *
     * @param seconds the expiration time in seconds
     * @return this builder
     */
    public Builder expiresIn(long seconds) {
      this.expiresIn = seconds;
      return this;
    }

    /**
     * Sets the maximum number of network retries.
     *
     * <p>For more advanced retry configuration, use {@link #retryConfig(RetryConfig)} instead.
     *
     * @param retries the maximum number of retries
     * @return this builder
     */
    public Builder maxNetworkRetries(int retries) {
      this.maxNetworkRetries = retries;
      return this;
    }

    /**
     * Sets the retry configuration.
     *
     * <p>This provides fine-grained control over retry behavior including backoff timing, jitter,
     * and retryable status codes. If set, this takes precedence over {@link
     * #maxNetworkRetries(int)}.
     *
     * <p>Example:
     *
     * <pre>{@code
     * RetryConfig retryConfig = RetryConfig.builder()
     *     .maxRetries(5)
     *     .initialBackoff(Duration.ofMillis(200))
     *     .maxBackoff(Duration.ofSeconds(60))
     *     .build();
     *
     * CdpClientOptions options = CdpClientOptions.builder()
     *     .apiKeyId("...")
     *     .apiKeySecret("...")
     *     .retryConfig(retryConfig)
     *     .build();
     * }</pre>
     *
     * @param config the retry configuration
     * @return this builder
     */
    public Builder retryConfig(RetryConfig config) {
      this.retryConfig = Optional.ofNullable(config);
      return this;
    }

    /**
     * Sets a custom HttpClient.Builder to use for HTTP requests.
     *
     * <p>The SDK will use this builder to create the underlying HttpClient, then layer
     * authentication and retry logic on top. This allows customizing connection settings, proxies,
     * SSL configuration, and other HttpClient options.
     *
     * <p>Example:
     *
     * <pre>{@code
     * HttpClient.Builder customBuilder = HttpClient.newBuilder()
     *     .connectTimeout(Duration.ofSeconds(10))
     *     .proxy(ProxySelector.of(new InetSocketAddress("proxy.example.com", 8080)));
     *
     * CdpClientOptions options = CdpClientOptions.builder()
     *     .apiKeyId("...")
     *     .apiKeySecret("...")
     *     .httpClientBuilder(customBuilder)
     *     .build();
     * }</pre>
     *
     * @param builder the HttpClient.Builder to use
     * @return this builder
     */
    public Builder httpClientBuilder(HttpClient.Builder builder) {
      this.httpClientBuilder = Optional.ofNullable(builder);
      return this;
    }

    /**
     * Builds the CdpClientOptions instance.
     *
     * @return the CdpClientOptions
     * @throws IllegalArgumentException if validation fails
     */
    public CdpClientOptions build() {
      return new CdpClientOptions(
          apiKeyId,
          apiKeySecret,
          walletSecret,
          debugging,
          basePath,
          expiresIn,
          maxNetworkRetries,
          retryConfig,
          httpClientBuilder);
    }
  }
}
