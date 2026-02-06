package com.coinbase.cdp.auth;

import static org.assertj.core.api.Assertions.*;

import com.coinbase.cdp.auth.exceptions.WalletSecretException;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.spec.ECGenParameterSpec;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class CdpTokenGeneratorTest {

  private String ecKey;
  private String walletSecret;
  private CdpTokenGenerator generatorWithWallet;
  private CdpTokenGenerator generatorWithoutWallet;

  @BeforeEach
  void setUp() throws Exception {
    ecKey = generateTestECKey();
    walletSecret = generateTestWalletKey();
    generatorWithWallet =
        new CdpTokenGenerator("test-key-id", ecKey, Optional.of(walletSecret), 120L);
    generatorWithoutWallet = new CdpTokenGenerator("test-key-id", ecKey, Optional.empty());
  }

  @Test
  void generatesBearerTokenOnly() {
    CdpTokenRequest request =
        CdpTokenRequest.builder().requestMethod("GET").requestPath("/v2/evm/accounts").build();

    CdpTokenResponse response = generatorWithWallet.generateTokens(request);

    assertThat(response.bearerToken()).isNotBlank();
    assertThat(response.bearerToken().split("\\.")).hasSize(3);
    assertThat(response.walletAuthToken()).isEmpty();
  }

  @Test
  void generatesBothTokensWhenRequested() {
    CdpTokenRequest request =
        CdpTokenRequest.builder()
            .requestMethod("POST")
            .requestPath("/v2/evm/accounts")
            .includeWalletAuthToken(true)
            .requestBody(Map.of("name", "test"))
            .build();

    CdpTokenResponse response = generatorWithWallet.generateTokens(request);

    assertThat(response.bearerToken()).isNotBlank();
    assertThat(response.bearerToken().split("\\.")).hasSize(3);
    assertThat(response.walletAuthToken()).isPresent();
    assertThat(response.walletAuthToken().get().split("\\.")).hasSize(3);
  }

  @Test
  void throwsWhenWalletSecretMissingButRequested() {
    CdpTokenRequest request =
        CdpTokenRequest.builder()
            .requestMethod("POST")
            .requestPath("/v2/evm/accounts")
            .includeWalletAuthToken(true)
            .build();

    assertThatThrownBy(() -> generatorWithoutWallet.generateTokens(request))
        .isInstanceOf(WalletSecretException.class)
        .hasMessageContaining("Wallet secret is required when includeWalletAuthToken is true");
  }

  @Test
  void usesDefaultHost() {
    CdpTokenRequest request =
        CdpTokenRequest.builder().requestMethod("GET").requestPath("/v2/evm/accounts").build();

    assertThat(request.requestHost()).isEqualTo("api.cdp.coinbase.com");

    // Should generate valid JWT even with default host
    CdpTokenResponse response = generatorWithWallet.generateTokens(request);
    assertThat(response.bearerToken()).isNotBlank();
  }

  @Test
  void usesCustomHost() {
    CdpTokenRequest request =
        CdpTokenRequest.builder()
            .requestMethod("GET")
            .requestHost("custom.api.com")
            .requestPath("/v2/evm/accounts")
            .build();

    CdpTokenResponse response = generatorWithWallet.generateTokens(request);

    assertThat(response.bearerToken()).isNotBlank();
    // Verify the host is in the JWT payload
    String[] parts = response.bearerToken().split("\\.");
    String payload = new String(Base64.getUrlDecoder().decode(parts[1]));
    assertThat(payload).contains("custom.api.com");
  }

  @Test
  void generatesValidBearerTokenWithConvenienceMethod() {
    String bearerToken =
        generatorWithWallet.generateBearerToken("GET", "api.cdp.coinbase.com", "/v2/evm/accounts");

    assertThat(bearerToken).isNotBlank();
    assertThat(bearerToken.split("\\.")).hasSize(3);
  }

  @Test
  void hasWalletSecretReturnsTrueWhenConfigured() {
    assertThat(generatorWithWallet.hasWalletSecret()).isTrue();
  }

  @Test
  void hasWalletSecretReturnsFalseWhenNotConfigured() {
    assertThat(generatorWithoutWallet.hasWalletSecret()).isFalse();
  }

  @Test
  void rejectsNullApiKeyId() {
    assertThatThrownBy(() -> new CdpTokenGenerator(null, ecKey, Optional.empty()))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("apiKeyId is required");
  }

  @Test
  void rejectsBlankApiKeyId() {
    assertThatThrownBy(() -> new CdpTokenGenerator("  ", ecKey, Optional.empty()))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("apiKeyId is required");
  }

  @Test
  void rejectsNullApiKeySecret() {
    assertThatThrownBy(() -> new CdpTokenGenerator("test-key-id", null, Optional.empty()))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("apiKeySecret is required");
  }

  @Test
  void rejectsBlankApiKeySecret() {
    assertThatThrownBy(() -> new CdpTokenGenerator("test-key-id", "  ", Optional.empty()))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("apiKeySecret is required");
  }

  @Test
  void handlesNullWalletSecretOptional() {
    CdpTokenGenerator generator = new CdpTokenGenerator("test-key-id", ecKey, null);

    assertThat(generator.hasWalletSecret()).isFalse();
  }

  @Test
  void usesDefaultExpiresInWhenZeroOrNegative() {
    CdpTokenGenerator generatorWithZero =
        new CdpTokenGenerator("test-key-id", ecKey, Optional.empty(), 0);
    CdpTokenGenerator generatorWithNegative =
        new CdpTokenGenerator("test-key-id", ecKey, Optional.empty(), -1);

    CdpTokenRequest request =
        CdpTokenRequest.builder().requestMethod("GET").requestPath("/v2/evm/accounts").build();

    // Both should generate valid tokens without errors
    assertThat(generatorWithZero.generateTokens(request).bearerToken()).isNotBlank();
    assertThat(generatorWithNegative.generateTokens(request).bearerToken()).isNotBlank();
  }

  @Test
  void includesRequestBodyHashInWalletToken() {
    Map<String, Object> body = Map.of("name", "test-account");
    CdpTokenRequest request =
        CdpTokenRequest.builder()
            .requestMethod("POST")
            .requestPath("/v2/evm/accounts")
            .includeWalletAuthToken(true)
            .requestBody(body)
            .build();

    CdpTokenResponse response = generatorWithWallet.generateTokens(request);

    // Verify reqHash is present in wallet token payload
    String[] parts = response.walletAuthToken().get().split("\\.");
    String payload = new String(Base64.getUrlDecoder().decode(parts[1]));
    assertThat(payload).contains("\"reqHash\"");
  }

  @Test
  void generatesWalletTokenWithoutRequestBody() {
    CdpTokenRequest request =
        CdpTokenRequest.builder()
            .requestMethod("POST")
            .requestPath("/v2/evm/accounts")
            .includeWalletAuthToken(true)
            .build();

    CdpTokenResponse response = generatorWithWallet.generateTokens(request);

    assertThat(response.walletAuthToken()).isPresent();
    // Verify reqHash is NOT present when no body
    String[] parts = response.walletAuthToken().get().split("\\.");
    String payload = new String(Base64.getUrlDecoder().decode(parts[1]));
    assertThat(payload).doesNotContain("\"reqHash\"");
  }

  @Test
  void generatesBothTokensWithPojoRequestBody() {
    // Simple POJO to simulate generated OpenAPI types like CreateEvmAccountRequest
    record TestRequest(String name, int value) {}

    TestRequest pojo = new TestRequest("test-account", 42);

    CdpTokenRequest request =
        CdpTokenRequest.builder()
            .requestMethod("POST")
            .requestPath("/v2/evm/accounts")
            .includeWalletAuthToken(true)
            .requestBody(pojo)
            .build();

    CdpTokenResponse response = generatorWithWallet.generateTokens(request);

    assertThat(response.bearerToken()).isNotBlank();
    assertThat(response.bearerToken().split("\\.")).hasSize(3);
    assertThat(response.walletAuthToken()).isPresent();
    assertThat(response.walletAuthToken().get().split("\\.")).hasSize(3);

    // Verify reqHash is present (POJO was converted to Map and hashed)
    String[] parts = response.walletAuthToken().get().split("\\.");
    String payload = new String(Base64.getUrlDecoder().decode(parts[1]));
    assertThat(payload).contains("\"reqHash\"");
  }

  private String generateTestECKey() throws Exception {
    KeyPairGenerator generator = KeyPairGenerator.getInstance("EC");
    generator.initialize(new ECGenParameterSpec("secp256r1"));
    KeyPair keyPair = generator.generateKeyPair();

    // Convert to PEM format
    StringBuilder pem = new StringBuilder();
    pem.append("-----BEGIN PRIVATE KEY-----\n");
    String base64 = Base64.getEncoder().encodeToString(keyPair.getPrivate().getEncoded());
    for (int i = 0; i < base64.length(); i += 64) {
      pem.append(base64, i, Math.min(i + 64, base64.length())).append("\n");
    }
    pem.append("-----END PRIVATE KEY-----\n");
    return pem.toString();
  }

  private String generateTestWalletKey() throws Exception {
    KeyPairGenerator generator = KeyPairGenerator.getInstance("EC");
    generator.initialize(new ECGenParameterSpec("secp256r1"));
    KeyPair keyPair = generator.generateKeyPair();
    return Base64.getEncoder().encodeToString(keyPair.getPrivate().getEncoded());
  }
}
