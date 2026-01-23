package com.coinbase.cdp.auth;

import java.util.List;
import java.util.Optional;

/**
 * Configuration options for JWT generation.
 *
 * <p>Supports both EC (ES256) and Ed25519 (EdDSA) keys. For REST API requests, all request
 * parameters (method, host, path) must be provided. For WebSocket JWTs, all request parameters
 * should be null.
 *
 * <p>Example usage:
 *
 * <pre>{@code
 * // REST API JWT
 * JwtOptions options = JwtOptions.builder("key-id", "key-secret")
 *     .requestMethod("GET")
 *     .requestHost("api.cdp.coinbase.com")
 *     .requestPath("/platform/v1/wallets")
 *     .expiresIn(120)
 *     .build();
 *
 * // WebSocket JWT (no URI claims)
 * JwtOptions wsOptions = JwtOptions.builder("key-id", "key-secret").build();
 * }</pre>
 */
public record JwtOptions(
    String keyId,
    String keySecret,
    String requestMethod,
    String requestHost,
    String requestPath,
    Optional<Long> expiresIn,
    Optional<List<String>> audience) {

  /** Default JWT expiration time in seconds. */
  public static final long DEFAULT_EXPIRES_IN = 120L;

  /**
   * Validates the JWT options.
   *
   * @throws IllegalArgumentException if validation fails
   */
  public JwtOptions {
    if (keyId == null || keyId.isBlank()) {
      throw new IllegalArgumentException("keyId is required");
    }
    if (keySecret == null || keySecret.isBlank()) {
      throw new IllegalArgumentException("keySecret is required");
    }

    // Validate: either all request params or none (for WebSocket)
    boolean hasAll = requestMethod != null && requestHost != null && requestPath != null;
    boolean hasNone = requestMethod == null && requestHost == null && requestPath == null;
    if (!hasAll && !hasNone) {
      throw new IllegalArgumentException(
          "Either all request details (method, host, path) must be provided, "
              + "or all must be null for WebSocket JWTs");
    }

    if (expiresIn == null) {
      expiresIn = Optional.empty();
    }
    if (audience == null) {
      audience = Optional.empty();
    }
  }

  /**
   * Creates a new builder for JwtOptions.
   *
   * @param keyId the API key ID
   * @param keySecret the API key secret (PEM EC key or base64 Ed25519 key)
   * @return a new builder instance
   */
  public static Builder builder(String keyId, String keySecret) {
    return new Builder(keyId, keySecret);
  }

  /**
   * Returns the effective expiration time in seconds.
   *
   * @return the expiration time, or the default if not set
   */
  public long getEffectiveExpiresIn() {
    return expiresIn.orElse(DEFAULT_EXPIRES_IN);
  }

  /**
   * Returns whether this is a REST API request (vs WebSocket).
   *
   * @return true if request parameters are provided
   */
  public boolean isRestRequest() {
    return requestMethod != null;
  }

  /** Builder for JwtOptions. */
  public static class Builder {
    private final String keyId;
    private final String keySecret;
    private String requestMethod;
    private String requestHost;
    private String requestPath;
    private Optional<Long> expiresIn = Optional.empty();
    private Optional<List<String>> audience = Optional.empty();

    private Builder(String keyId, String keySecret) {
      this.keyId = keyId;
      this.keySecret = keySecret;
    }

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
     * @param path the path (e.g., "/platform/v1/wallets")
     * @return this builder
     */
    public Builder requestPath(String path) {
      this.requestPath = path;
      return this;
    }

    /**
     * Sets the JWT expiration time in seconds.
     *
     * @param seconds the expiration time in seconds
     * @return this builder
     */
    public Builder expiresIn(long seconds) {
      this.expiresIn = Optional.of(seconds);
      return this;
    }

    /**
     * Sets the JWT audience claim.
     *
     * @param aud the audience list
     * @return this builder
     */
    public Builder audience(List<String> aud) {
      this.audience = Optional.ofNullable(aud);
      return this;
    }

    /**
     * Builds the JwtOptions instance.
     *
     * @return the JwtOptions
     * @throws IllegalArgumentException if validation fails
     */
    public JwtOptions build() {
      return new JwtOptions(
          keyId, keySecret, requestMethod, requestHost, requestPath, expiresIn, audience);
    }
  }
}
