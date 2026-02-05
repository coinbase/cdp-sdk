package com.coinbase.cdp.e2e;

import static org.assertj.core.api.Assertions.*;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.auth.CdpTokenGenerator;
import com.coinbase.cdp.auth.CdpTokenRequest;
import com.coinbase.cdp.auth.CdpTokenResponse;
import com.coinbase.cdp.auth.TokenProvider;
import com.coinbase.cdp.openapi.model.CreateEvmAccountRequest;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

/**
 * E2E tests for the TokenProvider authentication pattern.
 *
 * <p>These tests verify that clients can use pre-generated tokens instead of credentials, which is
 * useful for serverless environments and edge computing scenarios where secrets shouldn't be stored
 * on the client.
 */
class TokenProviderE2ETest {

  private CdpClient cdp;

  @AfterEach
  void teardown() {
    if (cdp != null) {
      cdp.close();
      cdp = null;
    }
  }

  @Test
  void shouldPerformReadOperationsWithTokenProvider() throws Exception {
    String apiKeyId = TestUtils.getEnvOrThrow("CDP_API_KEY_ID");
    String apiKeySecret = TestUtils.getEnvOrThrow("CDP_API_KEY_SECRET");

    // Create a token generator (simulating backend token generation)
    CdpTokenGenerator generator = new CdpTokenGenerator(apiKeyId, apiKeySecret, Optional.empty());

    // Generate tokens for a list accounts request
    // Note: The path must include /platform prefix to match the actual API request path
    CdpTokenRequest tokenRequest =
        CdpTokenRequest.builder()
            .requestMethod("GET")
            .requestHost("api.cdp.coinbase.com")
            .requestPath("/platform/v2/evm/accounts")
            .build();

    CdpTokenResponse tokens = generator.generateTokens(tokenRequest);

    // Create a TokenProvider that returns the pre-generated tokens
    TokenProvider tokenProvider =
        new TokenProvider() {
          @Override
          public String bearerToken() {
            return tokens.bearerToken();
          }

          @Override
          public Optional<String> walletAuthToken() {
            return Optional.empty(); // Not needed for read operations
          }
        };

    // Create client with the token provider
    cdp = CdpClient.builder().tokenProvider(tokenProvider).build();

    // Perform a read operation
    var accounts = cdp.evm().listAccounts();

    assertThat(accounts).isNotNull();
    assertThat(accounts.getAccounts()).isNotNull();
  }

  @Test
  void shouldPerformWriteOperationsWithTokenProvider() throws Exception {
    String apiKeyId = TestUtils.getEnvOrThrow("CDP_API_KEY_ID");
    String apiKeySecret = TestUtils.getEnvOrThrow("CDP_API_KEY_SECRET");
    String walletSecret = TestUtils.getEnvOrThrow("CDP_WALLET_SECRET");

    // Create account request for token generation
    CreateEvmAccountRequest createRequest =
        new CreateEvmAccountRequest().name(TestUtils.generateRandomName());

    // Create a token generator (simulating backend token generation)
    CdpTokenGenerator generator =
        new CdpTokenGenerator(apiKeyId, apiKeySecret, Optional.of(walletSecret));

    // Generate tokens for a create account request (write operation)
    // Note: The path must include /platform prefix to match the actual API request path
    CdpTokenRequest tokenRequest =
        CdpTokenRequest.builder()
            .requestMethod("POST")
            .requestHost("api.cdp.coinbase.com")
            .requestPath("/platform/v2/evm/accounts")
            .requestBody(createRequest)
            .includeWalletAuthToken(true)
            .build();

    CdpTokenResponse tokens = generator.generateTokens(tokenRequest);

    // Create a TokenProvider that returns the pre-generated tokens
    TokenProvider tokenProvider =
        new TokenProvider() {
          @Override
          public String bearerToken() {
            return tokens.bearerToken();
          }

          @Override
          public Optional<String> walletAuthToken() {
            return tokens.walletAuthToken(); // Required for write operations
          }
        };

    // Create client with the token provider
    cdp = CdpClient.builder().tokenProvider(tokenProvider).build();

    // Perform a write operation
    var account = cdp.evm().createAccount(createRequest);

    assertThat(account).isNotNull();
    assertThat(account.getAddress()).isNotBlank();
    assertThat(account.getName()).isEqualTo(createRequest.getName());
  }

  @Test
  void shouldCreateDynamicTokenProvider() throws Exception {
    String apiKeyId = TestUtils.getEnvOrThrow("CDP_API_KEY_ID");
    String apiKeySecret = TestUtils.getEnvOrThrow("CDP_API_KEY_SECRET");
    String walletSecret = TestUtils.getEnvOptional("CDP_WALLET_SECRET").orElse(null);

    // Create a token generator
    CdpTokenGenerator generator =
        new CdpTokenGenerator(apiKeyId, apiKeySecret, Optional.ofNullable(walletSecret));

    // Create a dynamic TokenProvider that generates fresh tokens for each request
    // Note: This pattern is useful when you need to make multiple different API calls
    // In real usage, you would track the current request context
    TokenProvider dynamicProvider =
        new TokenProvider() {
          // For this test, we'll generate a token for list accounts
          // Note: The path must include /platform prefix to match the actual API request path
          private final CdpTokenResponse tokens =
              generator.generateTokens(
                  CdpTokenRequest.builder()
                      .requestMethod("GET")
                      .requestHost("api.cdp.coinbase.com")
                      .requestPath("/platform/v2/evm/accounts")
                      .build());

          @Override
          public String bearerToken() {
            return tokens.bearerToken();
          }

          @Override
          public Optional<String> walletAuthToken() {
            return tokens.walletAuthToken();
          }
        };

    cdp = CdpClient.builder().tokenProvider(dynamicProvider).build();

    // Verify the client works
    var accounts = cdp.evm().listAccounts();
    assertThat(accounts).isNotNull();
  }

  @Test
  void shouldWorkWithCredentialsBuilderPattern() throws Exception {
    String apiKeyId = TestUtils.getEnvOrThrow("CDP_API_KEY_ID");
    String apiKeySecret = TestUtils.getEnvOrThrow("CDP_API_KEY_SECRET");
    String walletSecret = TestUtils.getEnvOptional("CDP_WALLET_SECRET").orElse(null);

    // Use the credentials builder pattern (auto token generation)
    var builder = CdpClient.builder().credentials(apiKeyId, apiKeySecret);

    if (walletSecret != null) {
      builder.walletSecret(walletSecret);
    }

    cdp = builder.build();

    // Perform read operation
    var accounts = cdp.evm().listAccounts();
    assertThat(accounts).isNotNull();

    // Perform write operation if wallet secret is available
    if (walletSecret != null) {
      var account = cdp.evm().createAccount();
      assertThat(account).isNotNull();
      assertThat(account.getAddress()).isNotBlank();
    }
  }

  @Test
  void shouldSupportMultipleOperationsWithSameClient() throws Exception {
    String apiKeyId = TestUtils.getEnvOrThrow("CDP_API_KEY_ID");
    String apiKeySecret = TestUtils.getEnvOrThrow("CDP_API_KEY_SECRET");
    String walletSecret = TestUtils.getEnvOptional("CDP_WALLET_SECRET").orElse(null);

    // Create client using credentials (recommended for multi-operation scenarios)
    var builder = CdpClient.builder().credentials(apiKeyId, apiKeySecret);
    if (walletSecret != null) {
      builder.walletSecret(walletSecret);
    }
    cdp = builder.build();

    // Perform multiple read operations
    var evmAccounts = cdp.evm().listAccounts();
    assertThat(evmAccounts).isNotNull();

    var solanaAccounts = cdp.solana().listAccounts();
    assertThat(solanaAccounts).isNotNull();

    var policies = cdp.policies().listPolicies();
    assertThat(policies).isNotNull();

    // Perform write operations if wallet secret is available
    if (walletSecret != null) {
      var evmAccount = cdp.evm().createAccount();
      assertThat(evmAccount).isNotNull();

      var solanaAccount = cdp.solana().createAccount();
      assertThat(solanaAccount).isNotNull();
    }
  }
}
