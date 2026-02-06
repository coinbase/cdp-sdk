package com.coinbase.cdp.e2e;

import static org.assertj.core.api.Assertions.*;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.auth.CdpTokenGenerator;
import com.coinbase.cdp.auth.CdpTokenRequest;
import com.coinbase.cdp.auth.TokenProvider;
import com.coinbase.cdp.http.RetryConfig;
import java.time.Duration;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

/**
 * E2E tests for CdpClient initialization patterns.
 *
 * <p>Tests both the credentials-based and TokenProvider-based authentication patterns.
 */
class CdpClientE2ETest {

  private CdpClient cdp;

  @AfterEach
  void teardown() {
    if (cdp != null) {
      cdp.close();
      cdp = null;
    }
  }

  @Test
  void shouldCreateClientFromEnvironment() {
    // This tests CdpClient.create() which reads from system environment variables only.
    // Note: CdpClient.create() does NOT read from .env files.
    // For .env support, use TestUtils.createDefaultClient() instead.
    cdp = TestUtils.createDefaultClient();

    assertThat(cdp).isNotNull();
    assertThat(cdp.evm()).isNotNull();
    assertThat(cdp.solana()).isNotNull();
    assertThat(cdp.policies()).isNotNull();
  }

  @Test
  void shouldCreateClientWithCredentialsBuilder() {
    String apiKeyId = TestUtils.getEnvOrThrow("CDP_API_KEY_ID");
    String apiKeySecret = TestUtils.getEnvOrThrow("CDP_API_KEY_SECRET");
    String walletSecret = TestUtils.getEnvOptional("CDP_WALLET_SECRET").orElse(null);

    cdp = TestUtils.createClientWithCredentials(apiKeyId, apiKeySecret, walletSecret);

    assertThat(cdp).isNotNull();
    assertThat(cdp.evm()).isNotNull();
    assertThat(cdp.solana()).isNotNull();
    assertThat(cdp.policies()).isNotNull();

    // Verify the client works by making a simple API call
    var accounts = cdp.evm().listAccounts();
    assertThat(accounts).isNotNull();
  }

  @Test
  void shouldCreateClientWithTokenProvider() {
    String apiKeyId = TestUtils.getEnvOrThrow("CDP_API_KEY_ID");
    String apiKeySecret = TestUtils.getEnvOrThrow("CDP_API_KEY_SECRET");
    String walletSecret = TestUtils.getEnvOptional("CDP_WALLET_SECRET").orElse(null);

    // Create a token generator to generate tokens for the provider
    CdpTokenGenerator generator =
        new CdpTokenGenerator(apiKeyId, apiKeySecret, Optional.ofNullable(walletSecret));

    // Create a simple TokenProvider implementation for a read operation
    // Note: The path must include /platform prefix to match the actual API request path
    TokenProvider tokenProvider =
        new TokenProvider() {
          @Override
          public String bearerToken() {
            CdpTokenRequest request =
                CdpTokenRequest.builder()
                    .requestMethod("GET")
                    .requestHost("api.cdp.coinbase.com")
                    .requestPath("/platform/v2/evm/accounts")
                    .build();
            return generator.generateTokens(request).bearerToken();
          }

          @Override
          public Optional<String> walletAuthToken() {
            return Optional.empty();
          }
        };

    cdp = TestUtils.createClientWithTokenProvider(tokenProvider);

    assertThat(cdp).isNotNull();
    assertThat(cdp.evm()).isNotNull();

    // Verify the client works with the token provider
    var accounts = cdp.evm().listAccounts();
    assertThat(accounts).isNotNull();
  }

  @Test
  void shouldCreateClientWithRetryConfig() {
    String apiKeyId = TestUtils.getEnvOrThrow("CDP_API_KEY_ID");
    String apiKeySecret = TestUtils.getEnvOrThrow("CDP_API_KEY_SECRET");
    String walletSecret = TestUtils.getEnvOptional("CDP_WALLET_SECRET").orElse(null);

    RetryConfig retryConfig =
        RetryConfig.builder()
            .maxRetries(5)
            .initialBackoff(Duration.ofMillis(200))
            .maxBackoff(Duration.ofSeconds(30))
            .backoffMultiplier(2.0)
            .build();

    cdp = TestUtils.createClientWithRetryConfig(apiKeyId, apiKeySecret, walletSecret, retryConfig);

    assertThat(cdp).isNotNull();

    // Verify the client works
    var accounts = cdp.evm().listAccounts();
    assertThat(accounts).isNotNull();
  }

  @Test
  void shouldCreateClientWithCustomHttpConfig() {
    String apiKeyId = TestUtils.getEnvOrThrow("CDP_API_KEY_ID");
    String apiKeySecret = TestUtils.getEnvOrThrow("CDP_API_KEY_SECRET");

    cdp =
        CdpClient.builder()
            .credentials(apiKeyId, apiKeySecret)
            .httpConfig(
                config -> config.debugging(false).retryConfig(RetryConfig.withMaxRetries(3)))
            .build();

    assertThat(cdp).isNotNull();

    // Verify the client works
    var accounts = cdp.evm().listAccounts();
    assertThat(accounts).isNotNull();
  }

  @Test
  void shouldCreateClientWithMaxNetworkRetries() {
    String apiKeyId = TestUtils.getEnvOrThrow("CDP_API_KEY_ID");
    String apiKeySecret = TestUtils.getEnvOrThrow("CDP_API_KEY_SECRET");

    cdp = CdpClient.builder().credentials(apiKeyId, apiKeySecret).maxNetworkRetries(5).build();

    assertThat(cdp).isNotNull();

    // Verify the client works
    var accounts = cdp.evm().listAccounts();
    assertThat(accounts).isNotNull();
  }

  @Test
  void shouldCreateClientWithExpiresIn() {
    String apiKeyId = TestUtils.getEnvOrThrow("CDP_API_KEY_ID");
    String apiKeySecret = TestUtils.getEnvOrThrow("CDP_API_KEY_SECRET");

    cdp =
        CdpClient.builder()
            .credentials(apiKeyId, apiKeySecret)
            .expiresIn(300) // 5 minutes
            .build();

    assertThat(cdp).isNotNull();

    // Verify the client works
    var accounts = cdp.evm().listAccounts();
    assertThat(accounts).isNotNull();
  }
}
