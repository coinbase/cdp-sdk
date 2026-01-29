package com.coinbase.cdp.auth;

import java.util.Optional;

/**
 * Configuration for generating CDP authentication tokens.
 *
 * <p>This unified request object supports generating both bearer tokens and optional wallet auth
 * tokens in a single call.
 *
 * <p>Example usage:
 *
 * <pre>{@code
 * CdpTokenRequest request = CdpTokenRequest.builder()
 *     .requestMethod("POST")
 *     .requestPath("/v2/evm/accounts")
 *     .includeWalletAuthToken(true)
 *     .requestBody(Map.of("name", "my-account"))
 *     .build();
 * }</pre>
 */
public record CdpTokenRequest(
    String requestMethod,
    String requestHost,
    String requestPath,
    boolean includeWalletAuthToken,
    Optional<Object> requestBody) {

  /** Default API host. */
  public static final String DEFAULT_HOST = "api.cdp.coinbase.com";

  /**
   * Validates the token request.
   *
   * @throws IllegalArgumentException if validation fails
   */
  public CdpTokenRequest {
    if (requestMethod == null || requestMethod.isBlank()) {
      throw new IllegalArgumentException("requestMethod is required");
    }
    if (requestPath == null || requestPath.isBlank()) {
      throw new IllegalArgumentException("requestPath is required");
    }
    if (requestHost == null || requestHost.isBlank()) {
      requestHost = DEFAULT_HOST;
    }
    if (requestBody == null) {
      requestBody = Optional.empty();
    }
  }

  /**
   * Creates a new builder for CdpTokenRequest.
   *
   * @return a new builder instance
   */
  public static Builder builder() {
    return new Builder();
  }

  /** Builder for CdpTokenRequest. */
  public static class Builder {
    private String requestMethod;
    private String requestHost = DEFAULT_HOST;
    private String requestPath;
    private boolean includeWalletAuthToken = false;
    private Optional<Object> requestBody = Optional.empty();

    /**
     * Sets the HTTP request method.
     *
     * @param method the HTTP method (e.g., "GET", "POST")
     * @return this builder
     */
    public Builder requestMethod(String method) {
      this.requestMethod = method;
      return this;
    }

    /**
     * Sets the request host.
     *
     * @param host the host (e.g., "api.cdp.coinbase.com")
     * @return this builder
     */
    public Builder requestHost(String host) {
      this.requestHost = host;
      return this;
    }

    /**
     * Sets the request path.
     *
     * @param path the path (e.g., "/v2/evm/accounts")
     * @return this builder
     */
    public Builder requestPath(String path) {
      this.requestPath = path;
      return this;
    }

    /**
     * Sets whether to include a wallet auth token in the response.
     *
     * <p>Set to true for wallet write operations (requires walletSecret configured).
     *
     * @param include true to include wallet auth token
     * @return this builder
     */
    public Builder includeWalletAuthToken(boolean include) {
      this.includeWalletAuthToken = include;
      return this;
    }

    /**
     * Sets the request body for wallet auth JWT hash generation.
     *
     * <p>Accepts any object type including generated OpenAPI request types (e.g., {@code
     * CreateEvmAccountRequest}) or {@code Map<String, Object>}. The object will be converted to a
     * Map for hashing during token generation.
     *
     * @param body the request payload (POJO or Map)
     * @return this builder
     */
    public Builder requestBody(Object body) {
      this.requestBody = Optional.ofNullable(body);
      return this;
    }

    /**
     * Builds the CdpTokenRequest instance.
     *
     * @return the CdpTokenRequest
     * @throws IllegalArgumentException if validation fails
     */
    public CdpTokenRequest build() {
      return new CdpTokenRequest(
          requestMethod, requestHost, requestPath, includeWalletAuthToken, requestBody);
    }
  }
}
