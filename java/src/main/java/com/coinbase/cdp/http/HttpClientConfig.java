package com.coinbase.cdp.http;

import java.net.http.HttpClient;
import java.util.Optional;

/**
 * Configuration for HTTP client behavior.
 *
 * <p>This class bundles HTTP-related settings (retry configuration, custom HttpClient, base path,
 * debugging) without requiring API credentials. It can be used with the CdpClient builder via
 * {@code httpConfig()}.
 *
 * <p>Example usage:
 *
 * <pre>{@code
 * // Use defaults (3 retries with exponential backoff)
 * HttpClientConfig config = HttpClientConfig.defaults();
 *
 * // Custom retry configuration
 * HttpClientConfig config = HttpClientConfig.builder()
 *     .retryConfig(RetryConfig.builder()
 *         .maxRetries(5)
 *         .initialBackoff(Duration.ofMillis(200))
 *         .build())
 *     .build();
 *
 * // Custom HttpClient with proxy
 * HttpClientConfig config = HttpClientConfig.builder()
 *     .httpClientBuilder(HttpClient.newBuilder()
 *         .proxy(ProxySelector.of(new InetSocketAddress("proxy.example.com", 8080))))
 *     .debugging(true)
 *     .build();
 *
 * // Disable retries
 * HttpClientConfig config = HttpClientConfig.builder()
 *     .retryConfig(RetryConfig.disabled())
 *     .build();
 *
 * // Use with CdpClient builder
 * CdpClient client = CdpClient.builder()
 *     .tokenProvider(tokens)
 *     .httpConfig(config)
 *     .build();
 * }</pre>
 */
public record HttpClientConfig(
    String basePath,
    Optional<RetryConfig> retryConfig,
    Optional<HttpClient.Builder> httpClientBuilder,
    boolean debugging) {

  /** Default base URL for the CDP API. */
  public static final String DEFAULT_BASE_PATH = "https://api.cdp.coinbase.com/platform";

  /**
   * Validates the configuration.
   *
   * @throws IllegalArgumentException if validation fails
   */
  public HttpClientConfig {
    if (basePath == null || basePath.isBlank()) {
      basePath = DEFAULT_BASE_PATH;
    }
    if (retryConfig == null) {
      retryConfig = Optional.empty();
    }
    if (httpClientBuilder == null) {
      httpClientBuilder = Optional.empty();
    }
  }

  /**
   * Creates an HttpClientConfig with default settings.
   *
   * <p>Default configuration:
   *
   * <ul>
   *   <li>basePath: https://api.cdp.coinbase.com/platform
   *   <li>retryConfig: default (3 retries with exponential backoff)
   *   <li>httpClientBuilder: default Java HttpClient
   *   <li>debugging: false
   * </ul>
   *
   * @return the default HTTP client configuration
   */
  public static HttpClientConfig defaults() {
    return new HttpClientConfig(DEFAULT_BASE_PATH, Optional.empty(), Optional.empty(), false);
  }

  /**
   * Creates an HttpClientConfig with the specified base path and default settings.
   *
   * @param basePath the API base path
   * @return an HTTP client configuration with the specified base path
   */
  public static HttpClientConfig withBasePath(String basePath) {
    return builder().basePath(basePath).build();
  }

  /**
   * Creates an HttpClientConfig with retries disabled.
   *
   * @return an HTTP client configuration with retries disabled
   */
  public static HttpClientConfig withoutRetries() {
    return builder().retryConfig(RetryConfig.disabled()).build();
  }

  /**
   * Creates a new builder for HttpClientConfig.
   *
   * @return a new builder instance
   */
  public static Builder builder() {
    return new Builder();
  }

  /** Builder for HttpClientConfig. */
  public static class Builder {
    private String basePath = DEFAULT_BASE_PATH;
    private Optional<RetryConfig> retryConfig = Optional.empty();
    private Optional<HttpClient.Builder> httpClientBuilder = Optional.empty();
    private boolean debugging = false;

    /**
     * Sets the base URL for the API.
     *
     * @param basePath the base URL (default: https://api.cdp.coinbase.com/platform)
     * @return this builder
     */
    public Builder basePath(String basePath) {
      this.basePath = basePath;
      return this;
    }

    /**
     * Sets the retry configuration.
     *
     * <p>This provides fine-grained control over retry behavior including backoff timing, jitter,
     * and retryable status codes.
     *
     * <p>Example:
     *
     * <pre>{@code
     * HttpClientConfig config = HttpClientConfig.builder()
     *     .retryConfig(RetryConfig.builder()
     *         .maxRetries(5)
     *         .initialBackoff(Duration.ofMillis(200))
     *         .build())
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
     * <p>The SDK will use this builder to create the underlying HttpClient, then layer retry logic
     * on top. This allows customizing connection settings, proxies, SSL configuration, and other
     * HttpClient options.
     *
     * <p>Example:
     *
     * <pre>{@code
     * HttpClientConfig config = HttpClientConfig.builder()
     *     .httpClientBuilder(HttpClient.newBuilder()
     *         .connectTimeout(Duration.ofSeconds(10))
     *         .proxy(ProxySelector.of(new InetSocketAddress("proxy.example.com", 8080))))
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
     * Sets whether to enable debug logging.
     *
     * <p>When enabled, retry attempts and other HTTP client operations will be logged.
     *
     * @param debugging true to enable debug logging
     * @return this builder
     */
    public Builder debugging(boolean debugging) {
      this.debugging = debugging;
      return this;
    }

    /**
     * Builds the HttpClientConfig instance.
     *
     * @return the HttpClientConfig
     */
    public HttpClientConfig build() {
      return new HttpClientConfig(basePath, retryConfig, httpClientBuilder, debugging);
    }
  }
}
