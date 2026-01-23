package com.coinbase.cdp.auth;

import static org.assertj.core.api.Assertions.*;

import com.coinbase.cdp.auth.exceptions.JwtGenerationException;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.spec.ECGenParameterSpec;
import java.util.Base64;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class WalletJwtGeneratorTest {

  private String walletSecret;

  @BeforeEach
  void setUp() throws Exception {
    walletSecret = generateTestWalletKey();
  }

  @Test
  void generatesValidWalletJwt() {
    WalletJwtOptions options =
        new WalletJwtOptions(
            walletSecret,
            "POST",
            "api.cdp.coinbase.com",
            "/platform/v1/accounts",
            Map.of("name", "test-account"));

    String jwt = WalletJwtGenerator.generateWalletJwt(options);

    assertThat(jwt).isNotBlank();
    assertThat(jwt.split("\\.")).hasSize(3);
  }

  @Test
  void includesReqHashWhenRequestDataPresent() {
    WalletJwtOptions options =
        new WalletJwtOptions(
            walletSecret,
            "POST",
            "api.cdp.coinbase.com",
            "/platform/v1/accounts",
            Map.of("name", "test-account", "network", "base-sepolia"));

    String jwt = WalletJwtGenerator.generateWalletJwt(options);

    String[] parts = jwt.split("\\.");
    String payload = new String(Base64.getUrlDecoder().decode(parts[1]));
    assertThat(payload).contains("\"reqHash\"");
  }

  @Test
  void omitsReqHashWhenRequestDataEmpty() {
    WalletJwtOptions options =
        new WalletJwtOptions(
            walletSecret, "DELETE", "api.cdp.coinbase.com", "/platform/v1/accounts/123", Map.of());

    String jwt = WalletJwtGenerator.generateWalletJwt(options);

    String[] parts = jwt.split("\\.");
    String payload = new String(Base64.getUrlDecoder().decode(parts[1]));
    assertThat(payload).doesNotContain("\"reqHash\"");
  }

  @Test
  void includesUrisClaim() {
    WalletJwtOptions options =
        new WalletJwtOptions(
            walletSecret, "POST", "api.cdp.coinbase.com", "/platform/v1/accounts", Map.of());

    String jwt = WalletJwtGenerator.generateWalletJwt(options);

    String[] parts = jwt.split("\\.");
    String payload = new String(Base64.getUrlDecoder().decode(parts[1]));
    assertThat(payload).contains("\"uris\"");
    assertThat(payload).contains("POST api.cdp.coinbase.com/platform/v1/accounts");
  }

  @Test
  void includesJtiClaim() {
    WalletJwtOptions options =
        new WalletJwtOptions(
            walletSecret, "POST", "api.cdp.coinbase.com", "/platform/v1/accounts", Map.of());

    String jwt = WalletJwtGenerator.generateWalletJwt(options);

    String[] parts = jwt.split("\\.");
    String payload = new String(Base64.getUrlDecoder().decode(parts[1]));
    assertThat(payload).contains("\"jti\"");
  }

  @Test
  void producesConsistentHashForSameData() {
    // Request data with keys in different order should produce same hash
    Map<String, Object> data1 = Map.of("name", "test", "network", "base-sepolia");
    Map<String, Object> data2 = Map.of("network", "base-sepolia", "name", "test");

    WalletJwtOptions options1 =
        new WalletJwtOptions(
            walletSecret, "POST", "api.cdp.coinbase.com", "/platform/v1/accounts", data1);
    WalletJwtOptions options2 =
        new WalletJwtOptions(
            walletSecret, "POST", "api.cdp.coinbase.com", "/platform/v1/accounts", data2);

    String jwt1 = WalletJwtGenerator.generateWalletJwt(options1);
    String jwt2 = WalletJwtGenerator.generateWalletJwt(options2);

    // Extract reqHash from both JWTs
    String payload1 = new String(Base64.getUrlDecoder().decode(jwt1.split("\\.")[1]));
    String payload2 = new String(Base64.getUrlDecoder().decode(jwt2.split("\\.")[1]));

    // The reqHash values should be the same
    String hash1 = extractReqHash(payload1);
    String hash2 = extractReqHash(payload2);
    assertThat(hash1).isEqualTo(hash2);
  }

  @Test
  void rejectsNullWalletSecret() {
    assertThatThrownBy(
            () ->
                new WalletJwtOptions(
                    null, "POST", "api.cdp.coinbase.com", "/platform/v1/accounts", Map.of()))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("walletSecret");
  }

  @Test
  void rejectsNullRequestMethod() {
    assertThatThrownBy(
            () ->
                new WalletJwtOptions(
                    walletSecret, null, "api.cdp.coinbase.com", "/platform/v1/accounts", Map.of()))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("requestMethod");
  }

  @Test
  void rejectsInvalidWalletSecret() {
    assertThatThrownBy(
            () ->
                WalletJwtGenerator.generateWalletJwt(
                    new WalletJwtOptions(
                        "invalid-secret",
                        "POST",
                        "api.cdp.coinbase.com",
                        "/platform/v1/accounts",
                        Map.of())))
        .isInstanceOf(JwtGenerationException.class);
  }

  private String extractReqHash(String payload) {
    int start = payload.indexOf("\"reqHash\":\"") + 11;
    int end = payload.indexOf("\"", start);
    return payload.substring(start, end);
  }

  private String generateTestWalletKey() throws Exception {
    KeyPairGenerator generator = KeyPairGenerator.getInstance("EC");
    generator.initialize(new ECGenParameterSpec("secp256r1"));
    KeyPair keyPair = generator.generateKeyPair();

    // Return as base64 DER (PKCS#8 format)
    return Base64.getEncoder().encodeToString(keyPair.getPrivate().getEncoded());
  }
}
