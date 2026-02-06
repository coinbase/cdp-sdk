package com.coinbase.cdp.auth;

import java.util.Optional;

/**
 * Response containing generated CDP authentication tokens.
 *
 * <p>Always contains a bearer token. Optionally contains a wallet auth token if {@code
 * includeWalletAuthToken} was set to true in the request.
 *
 * <p>This class implements {@link TokenProvider} and can be used wherever token providers are
 * accepted, such as in CDP client factory methods.
 *
 * <p>Example usage:
 *
 * <pre>{@code
 * CdpTokenResponse response = generator.generateTokens(request);
 *
 * // Bearer token for Authorization header
 * String bearerToken = response.bearerToken();
 *
 * // Wallet auth token for X-Wallet-Auth header (if requested)
 * response.walletAuthToken().ifPresent(walletJwt -> {
 *     // Use wallet JWT
 * });
 *
 * // Use as TokenProvider
 * CdpClient client = CdpClient.builder()
 *     .tokenProvider(response)
 *     .build();
 * EvmClient evmClient = client.evm();
 * }</pre>
 */
public record CdpTokenResponse(String bearerToken, Optional<String> walletAuthToken)
    implements TokenProvider {

  /**
   * Validates the token response.
   *
   * @throws IllegalArgumentException if validation fails
   */
  public CdpTokenResponse {
    if (bearerToken == null || bearerToken.isBlank()) {
      throw new IllegalArgumentException("bearerToken is required");
    }
    if (walletAuthToken == null) {
      walletAuthToken = Optional.empty();
    }
  }

  /**
   * Creates a response with only a bearer token.
   *
   * @param bearerToken the bearer token
   * @return the token response
   */
  public static CdpTokenResponse bearerOnly(String bearerToken) {
    return new CdpTokenResponse(bearerToken, Optional.empty());
  }

  /**
   * Creates a response with both bearer and wallet auth tokens.
   *
   * @param bearerToken the bearer token
   * @param walletAuthToken the wallet auth token
   * @return the token response
   */
  public static CdpTokenResponse withWalletAuth(String bearerToken, String walletAuthToken) {
    return new CdpTokenResponse(bearerToken, Optional.of(walletAuthToken));
  }
}
