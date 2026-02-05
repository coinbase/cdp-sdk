package com.coinbase.cdp.auth;

import java.util.Optional;

/**
 * Provides authentication tokens for CDP API requests.
 *
 * <p>This interface defines the contract for supplying bearer tokens and optional wallet auth
 * tokens to CDP clients. It allows for flexible token provisioning from various sources, including
 * internal token generators, external authentication services, or custom token management systems.
 *
 * <p>Implementations must provide:
 *
 * <ul>
 *   <li>A bearer token for the {@code Authorization} header
 *   <li>An optional wallet auth token for the {@code X-Wallet-Auth} header
 * </ul>
 *
 * <p>Example implementation for a custom token source:
 *
 * <pre>{@code
 * public class ExternalTokenProvider implements TokenProvider {
 *     private final ExternalAuthService authService;
 *
 *     public ExternalTokenProvider(ExternalAuthService authService) {
 *         this.authService = authService;
 *     }
 *
 *     @Override
 *     public String bearerToken() {
 *         return authService.getBearerToken();
 *     }
 *
 *     @Override
 *     public Optional<String> walletAuthToken() {
 *         return authService.getWalletAuthToken();
 *     }
 * }
 *
 * // Usage with CDP clients
 * TokenProvider tokens = new ExternalTokenProvider(authService);
 * CdpClient client = CdpClient.builder()
 *     .tokenProvider(tokens)
 *     .build();
 * EvmClient evmClient = client.evm();
 * PoliciesClient policiesClient = client.policies();
 * }</pre>
 *
 * <p>The SDK provides a default implementation via {@link CdpTokenResponse} that is returned by
 * {@link CdpTokenGenerator}.
 *
 * @see CdpTokenResponse
 * @see CdpTokenGenerator
 */
public interface TokenProvider {

  /**
   * Returns the bearer token for the {@code Authorization} header.
   *
   * <p>This token is required for all CDP API requests and authenticates the client application.
   *
   * @return the bearer token (must not be null or blank)
   */
  String bearerToken();

  /**
   * Returns the optional wallet auth token for the {@code X-Wallet-Auth} header.
   *
   * <p>This token is required for write operations (POST, PUT, DELETE) on account endpoints. It
   * includes a hash of the request body and additional request metadata for enhanced security.
   *
   * @return an Optional containing the wallet auth token, or empty if not available
   */
  Optional<String> walletAuthToken();
}
