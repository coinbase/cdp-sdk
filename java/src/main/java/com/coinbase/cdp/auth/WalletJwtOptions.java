package com.coinbase.cdp.auth;

import java.util.Map;

/**
 * Configuration options for Wallet Auth JWT generation.
 *
 * <p>Wallet JWTs are used to authenticate write operations on account endpoints. They include a
 * hash of the request body for integrity verification.
 *
 * <p>Example usage:
 *
 * <pre>{@code
 * WalletJwtOptions options = new WalletJwtOptions(
 *     walletSecret,
 *     "POST",
 *     "api.cdp.coinbase.com",
 *     "/platform/v1/accounts",
 *     Map.of("name", "my-account")
 * );
 * }</pre>
 */
public record WalletJwtOptions(
    String walletSecret,
    String requestMethod,
    String requestHost,
    String requestPath,
    Map<String, Object> requestData) {

  /**
   * Validates the wallet JWT options.
   *
   * @throws IllegalArgumentException if validation fails
   */
  public WalletJwtOptions {
    if (walletSecret == null || walletSecret.isBlank()) {
      throw new IllegalArgumentException("walletSecret is required");
    }
    if (requestMethod == null || requestMethod.isBlank()) {
      throw new IllegalArgumentException("requestMethod is required");
    }
    if (requestHost == null || requestHost.isBlank()) {
      throw new IllegalArgumentException("requestHost is required");
    }
    if (requestPath == null || requestPath.isBlank()) {
      throw new IllegalArgumentException("requestPath is required");
    }
    if (requestData == null) {
      requestData = Map.of();
    }
  }

  /**
   * Returns whether the request has data to hash.
   *
   * @return true if request data is non-empty
   */
  public boolean hasRequestData() {
    return requestData != null
        && !requestData.isEmpty()
        && requestData.values().stream().anyMatch(v -> v != null);
  }
}
