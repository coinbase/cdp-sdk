package com.coinbase.cdp.auth;

import com.coinbase.cdp.auth.exceptions.JwtGenerationException;
import com.coinbase.cdp.utils.HashUtils;
import com.coinbase.cdp.utils.JsonUtils;
import io.jsonwebtoken.Jwts;
import java.security.PrivateKey;
import java.time.Instant;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Generates Wallet Auth JWT tokens for authenticating with wallet-specific endpoints.
 *
 * <p>Wallet JWTs are required for write operations (POST, PUT, DELETE) on account and
 * spend-permission endpoints. They include a hash of the request body for integrity verification.
 *
 * <p>Example usage:
 *
 * <pre>{@code
 * String walletJwt = WalletJwtGenerator.generateWalletJwt(
 *     new WalletJwtOptions(
 *         walletSecret,
 *         "POST",
 *         "api.cdp.coinbase.com",
 *         "/platform/v1/accounts",
 *         Map.of("name", "my-account")
 *     ));
 * }</pre>
 */
public final class WalletJwtGenerator {

  private WalletJwtGenerator() {}

  /**
   * Generates a wallet authentication JWT.
   *
   * @param options the wallet JWT configuration options
   * @return the generated JWT string
   * @throws JwtGenerationException if token generation fails
   */
  public static String generateWalletJwt(WalletJwtOptions options) {
    try {
      PrivateKey privateKey = KeyParser.parseWalletKey(options.walletSecret());

      long now = Instant.now().getEpochSecond();
      String uri =
          String.format(
              "%s %s%s", options.requestMethod(), options.requestHost(), options.requestPath());

      Map<String, Object> header = new HashMap<>();
      header.put("alg", "ES256");
      header.put("typ", "JWT");

      var builder =
          Jwts.builder()
              .header()
              .add(header)
              .and()
              .issuedAt(Date.from(Instant.ofEpochSecond(now)))
              .notBefore(Date.from(Instant.ofEpochSecond(now)))
              .id(UUID.randomUUID().toString())
              .claim("uris", List.of(uri));

      // Add reqHash if request data is present
      if (options.hasRequestData()) {
        Map<String, Object> sorted = JsonUtils.sortKeys(options.requestData());
        String json = JsonUtils.toJson(sorted);
        String hash = HashUtils.sha256Hex(json);
        builder.claim("reqHash", hash);
      }

      return builder.signWith(privateKey, Jwts.SIG.ES256).compact();

    } catch (JwtGenerationException e) {
      throw e;
    } catch (Exception e) {
      throw new JwtGenerationException("Failed to generate wallet JWT: " + e.getMessage(), e);
    }
  }
}
