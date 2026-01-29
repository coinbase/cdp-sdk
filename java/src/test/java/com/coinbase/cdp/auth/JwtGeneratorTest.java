package com.coinbase.cdp.auth;

import static org.assertj.core.api.Assertions.*;

import com.coinbase.cdp.auth.exceptions.JwtGenerationException;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.spec.ECGenParameterSpec;
import java.util.Base64;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class JwtGeneratorTest {

  private String ecKey;
  private String ed25519Key;

  @BeforeEach
  void setUp() throws Exception {
    ecKey = generateTestECKey();
    ed25519Key = generateTestEd25519Key();
  }

  @Test
  void generatesValidJwtWithEcKey() {
    JwtOptions options =
        JwtOptions.builder("test-key-id", ecKey)
            .requestMethod("GET")
            .requestHost("api.cdp.coinbase.com")
            .requestPath("/platform/v1/wallets")
            .build();

    String jwt = JwtGenerator.generateJwt(options);

    assertThat(jwt).isNotBlank();
    assertThat(jwt.split("\\.")).hasSize(3);
  }

  @Test
  void generatesValidJwtWithEd25519Key() {
    JwtOptions options =
        JwtOptions.builder("test-key-id", ed25519Key)
            .requestMethod("GET")
            .requestHost("api.cdp.coinbase.com")
            .requestPath("/platform/v1/wallets")
            .build();

    String jwt = JwtGenerator.generateJwt(options);

    assertThat(jwt).isNotBlank();
    assertThat(jwt.split("\\.")).hasSize(3);
  }

  @Test
  void generatesWebSocketJwtWithoutUris() {
    JwtOptions options = JwtOptions.builder("test-key-id", ecKey).build();

    String jwt = JwtGenerator.generateJwt(options);

    assertThat(jwt).isNotBlank();
    assertThat(jwt.split("\\.")).hasSize(3);

    // Decode payload and verify no uris claim
    String[] parts = jwt.split("\\.");
    String payload = new String(Base64.getUrlDecoder().decode(parts[1]));
    assertThat(payload).doesNotContain("\"uris\"");
  }

  @Test
  void includesUrisClaimForRestRequest() {
    JwtOptions options =
        JwtOptions.builder("test-key-id", ecKey)
            .requestMethod("POST")
            .requestHost("api.cdp.coinbase.com")
            .requestPath("/platform/v1/accounts")
            .build();

    String jwt = JwtGenerator.generateJwt(options);

    String[] parts = jwt.split("\\.");
    String payload = new String(Base64.getUrlDecoder().decode(parts[1]));
    assertThat(payload).contains("\"uris\"");
    assertThat(payload).contains("POST api.cdp.coinbase.com/platform/v1/accounts");
  }

  @Test
  void includesAudienceClaimWhenProvided() {
    JwtOptions options =
        JwtOptions.builder("test-key-id", ecKey)
            .requestMethod("GET")
            .requestHost("api.cdp.coinbase.com")
            .requestPath("/platform/v1/wallets")
            .audience(List.of("test-audience"))
            .build();

    String jwt = JwtGenerator.generateJwt(options);

    String[] parts = jwt.split("\\.");
    String payload = new String(Base64.getUrlDecoder().decode(parts[1]));
    assertThat(payload).contains("\"aud\"");
  }

  @Test
  void usesCustomExpiresIn() {
    JwtOptions options =
        JwtOptions.builder("test-key-id", ecKey)
            .requestMethod("GET")
            .requestHost("api.cdp.coinbase.com")
            .requestPath("/platform/v1/wallets")
            .expiresIn(300)
            .build();

    String jwt = JwtGenerator.generateJwt(options);

    assertThat(jwt).isNotBlank();
    assertThat(options.getEffectiveExpiresIn()).isEqualTo(300);
  }

  @Test
  void rejectsNullKeyId() {
    assertThatThrownBy(() -> JwtOptions.builder(null, ecKey).build())
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("keyId");
  }

  @Test
  void rejectsNullKeySecret() {
    assertThatThrownBy(() -> JwtOptions.builder("test-key-id", null).build())
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("keySecret");
  }

  @Test
  void rejectsPartialRequestParams() {
    assertThatThrownBy(
            () ->
                JwtOptions.builder("test-key-id", ecKey)
                    .requestMethod("GET")
                    .requestHost("api.cdp.coinbase.com")
                    // Missing requestPath
                    .build())
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("Either all request details");
  }

  @Test
  void rejectsInvalidKeyFormat() {
    assertThatThrownBy(
            () ->
                JwtGenerator.generateJwt(
                    JwtOptions.builder("test-key-id", "invalid-key-data").build()))
        .isInstanceOf(JwtGenerationException.class);
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

  private String generateTestEd25519Key() throws Exception {
    KeyPairGenerator generator = KeyPairGenerator.getInstance("Ed25519");
    KeyPair keyPair = generator.generateKeyPair();

    // Get raw key bytes
    byte[] privateBytes = keyPair.getPrivate().getEncoded();
    byte[] publicBytes = keyPair.getPublic().getEncoded();

    // Extract the actual key material (last 32 bytes of each)
    byte[] seed = new byte[32];
    byte[] publicKey = new byte[32];
    System.arraycopy(privateBytes, privateBytes.length - 32, seed, 0, 32);
    System.arraycopy(publicBytes, publicBytes.length - 32, publicKey, 0, 32);

    // Combine seed + public key (64 bytes total)
    byte[] combined = new byte[64];
    System.arraycopy(seed, 0, combined, 0, 32);
    System.arraycopy(publicKey, 0, combined, 32, 32);

    return Base64.getEncoder().encodeToString(combined);
  }
}
