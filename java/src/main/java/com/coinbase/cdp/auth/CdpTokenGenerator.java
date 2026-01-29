package com.coinbase.cdp.auth;

import com.coinbase.cdp.auth.exceptions.WalletSecretException;
import com.coinbase.cdp.openapi.ApiClient;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.Optional;

/**
 * Unified token generator for CDP authentication.
 *
 * <p>Generates bearer tokens and optionally wallet auth tokens in a single call. This class
 * composes the existing {@link JwtGenerator} and {@link WalletJwtGenerator} to provide a
 * simplified, unified API.
 *
 * <p>Example usage:
 *
 * <pre>{@code
 * // With wallet secret for write operations
 * CdpTokenGenerator generator = new CdpTokenGenerator(
 *     "api-key-id", "api-key-secret", Optional.of("wallet-secret"));
 *
 * CdpTokenRequest request = CdpTokenRequest.builder()
 *     .requestMethod("POST")
 *     .requestPath("/v2/evm/accounts")
 *     .includeWalletAuthToken(true)
 *     .requestBody(Map.of("name", "my-account"))
 *     .build();
 *
 * CdpTokenResponse tokens = generator.generateTokens(request);
 * // tokens.bearerToken() - for Authorization header
 * // tokens.walletAuthToken() - for X-Wallet-Auth header
 * }</pre>
 */
public class CdpTokenGenerator {

  private final String apiKeyId;
  private final String apiKeySecret;
  private final Optional<String> walletSecret;
  private final long expiresIn;
  private final ObjectMapper objectMapper;

  /**
   * Creates a new token generator with default expiration.
   *
   * @param apiKeyId the API key ID
   * @param apiKeySecret the API key secret (PEM EC key or base64 Ed25519 key)
   * @param walletSecret optional wallet secret for wallet auth tokens
   */
  public CdpTokenGenerator(String apiKeyId, String apiKeySecret, Optional<String> walletSecret) {
    this(apiKeyId, apiKeySecret, walletSecret, JwtOptions.DEFAULT_EXPIRES_IN);
  }

  /**
   * Creates a new token generator with custom expiration.
   *
   * @param apiKeyId the API key ID
   * @param apiKeySecret the API key secret (PEM EC key or base64 Ed25519 key)
   * @param walletSecret optional wallet secret for wallet auth tokens
   * @param expiresIn JWT expiration time in seconds
   */
  public CdpTokenGenerator(
      String apiKeyId, String apiKeySecret, Optional<String> walletSecret, long expiresIn) {
    if (apiKeyId == null || apiKeyId.isBlank()) {
      throw new IllegalArgumentException("apiKeyId is required");
    }
    if (apiKeySecret == null || apiKeySecret.isBlank()) {
      throw new IllegalArgumentException("apiKeySecret is required");
    }
    this.apiKeyId = apiKeyId;
    this.apiKeySecret = apiKeySecret;
    this.walletSecret = walletSecret != null ? walletSecret : Optional.empty();
    this.expiresIn = expiresIn > 0 ? expiresIn : JwtOptions.DEFAULT_EXPIRES_IN;
    this.objectMapper = ApiClient.createDefaultObjectMapper();
  }

  /**
   * Generates authentication tokens based on the request configuration.
   *
   * @param request the token request configuration
   * @return the generated tokens
   * @throws WalletSecretException if wallet auth is requested but no wallet secret is configured
   */
  public CdpTokenResponse generateTokens(CdpTokenRequest request) {
    // Generate bearer token
    String bearerToken =
        JwtGenerator.generateJwt(
            JwtOptions.builder(apiKeyId, apiKeySecret)
                .requestMethod(request.requestMethod())
                .requestHost(request.requestHost())
                .requestPath(request.requestPath())
                .expiresIn(expiresIn)
                .build());

    // Generate wallet auth token if requested
    if (request.includeWalletAuthToken()) {
      if (walletSecret.isEmpty()) {
        throw new WalletSecretException(
            "Wallet secret is required when includeWalletAuthToken is true. "
                + "Set CDP_WALLET_SECRET environment variable or pass walletSecret in options.");
      }

      Map<String, Object> bodyMap = convertToMap(request.requestBody().orElse(null));
      String walletAuthToken =
          WalletJwtGenerator.generateWalletJwt(
              new WalletJwtOptions(
                  walletSecret.get(),
                  request.requestMethod(),
                  request.requestHost(),
                  request.requestPath(),
                  bodyMap));

      return CdpTokenResponse.withWalletAuth(bearerToken, walletAuthToken);
    }

    return CdpTokenResponse.bearerOnly(bearerToken);
  }

  /**
   * Generates only a bearer token (convenience method).
   *
   * @param method the HTTP method
   * @param host the request host
   * @param path the request path
   * @return the bearer token
   */
  public String generateBearerToken(String method, String host, String path) {
    return JwtGenerator.generateJwt(
        JwtOptions.builder(apiKeyId, apiKeySecret)
            .requestMethod(method)
            .requestHost(host)
            .requestPath(path)
            .expiresIn(expiresIn)
            .build());
  }

  /**
   * Returns whether this generator has a wallet secret configured.
   *
   * @return true if wallet secret is available
   */
  public boolean hasWalletSecret() {
    return walletSecret.isPresent();
  }

  /**
   * Converts an object to a Map for request body hashing.
   *
   * <p>Supports both Map objects and POJOs (e.g., generated OpenAPI request types).
   *
   * @param obj the object to convert (may be null)
   * @return the Map representation, or empty Map if null
   */
  @SuppressWarnings("unchecked")
  private Map<String, Object> convertToMap(Object obj) {
    if (obj == null) {
      return Map.of();
    }
    if (obj instanceof Map) {
      return (Map<String, Object>) obj;
    }
    // Use Jackson ObjectMapper to convert POJO to Map
    return objectMapper.convertValue(obj, new TypeReference<Map<String, Object>>() {});
  }
}
