package com.coinbase.cdp.examples.config;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.CdpClientOptions;
import com.coinbase.cdp.examples.utils.EnvLoader;
import com.coinbase.cdp.http.RetryConfig;
import java.time.Duration;

/**
 * Example: Configure HTTP retry behavior.
 *
 * <p>This example demonstrates how to configure HTTP retry behavior for the CDP SDK using
 * RetryConfig. The SDK supports exponential backoff with jitter for handling transient failures
 * and rate limiting.
 *
 * <p>RetryConfig can be customized with:
 *
 * <ul>
 *   <li>maxRetries - Maximum number of retry attempts (default: 3)
 *   <li>initialBackoff - Initial delay before first retry (default: 100ms)
 *   <li>maxBackoff - Maximum backoff cap (default: 30s)
 *   <li>backoffMultiplier - Exponential backoff factor (default: 2.0)
 *   <li>jitterFactor - Randomization to prevent thundering herd (default: 0.25)
 * </ul>
 *
 * <p>Usage: ./gradlew runRetryConfiguration
 */
public class RetryConfiguration {

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    // Example 1: Default retry configuration
    // Uses 3 retries, 100ms initial backoff, 30s max backoff, 2.0 multiplier, 0.25 jitter
    System.out.println("=== Example 1: Default Retry Configuration ===");
    RetryConfig defaultConfig = RetryConfig.defaultConfig();
    System.out.println("Max retries: " + defaultConfig.maxRetries());
    System.out.println("Initial backoff: " + defaultConfig.initialBackoff().toMillis() + "ms");
    System.out.println("Max backoff: " + defaultConfig.maxBackoff().toSeconds() + "s");
    System.out.println("Backoff multiplier: " + defaultConfig.backoffMultiplier());
    System.out.println("Jitter factor: " + defaultConfig.jitterFactor());
    System.out.println();

    // Example 2: Custom retry configuration using builder
    System.out.println("=== Example 2: Custom Retry Configuration ===");
    RetryConfig customConfig =
        RetryConfig.builder()
            .maxRetries(5)
            .initialBackoff(Duration.ofMillis(200))
            .maxBackoff(Duration.ofSeconds(60))
            .backoffMultiplier(2.0)
            .jitterFactor(0.3)
            .build();
    System.out.println("Max retries: " + customConfig.maxRetries());
    System.out.println("Initial backoff: " + customConfig.initialBackoff().toMillis() + "ms");
    System.out.println("Max backoff: " + customConfig.maxBackoff().toSeconds() + "s");
    System.out.println("Backoff multiplier: " + customConfig.backoffMultiplier());
    System.out.println("Jitter factor: " + customConfig.jitterFactor());
    System.out.println();

    // Example 3: Disabled retries
    System.out.println("=== Example 3: Disabled Retries ===");
    RetryConfig disabledConfig = RetryConfig.disabled();
    System.out.println("Max retries: " + disabledConfig.maxRetries());
    System.out.println();

    // Example 4: Using RetryConfig with CdpClient via CdpClientOptions
    System.out.println("=== Example 4: Using RetryConfig with CdpClientOptions ===");

    // Build CdpClientOptions with custom retry configuration
    // Note: EnvLoader sets system properties, so we read from both env vars and properties
    CdpClientOptions options =
        CdpClientOptions.builder()
            .apiKeyId(getEnvOrProperty("CDP_API_KEY_ID"))
            .apiKeySecret(getEnvOrProperty("CDP_API_KEY_SECRET"))
            .walletSecret(getEnvOrProperty("CDP_WALLET_SECRET"))
            .retryConfig(customConfig)
            .build();

    try (CdpClient cdp = CdpClient.create(options)) {
      // Make a simple API call to verify the configuration works
      var accounts = cdp.evm().listAccounts();
      System.out.println("Successfully connected with custom retry config!");
      System.out.println("Found " + accounts.getAccounts().size() + " EVM accounts");
    }

    System.out.println();

    // Example 5: Using RetryConfig with CdpClient.builder()
    System.out.println("=== Example 5: Using RetryConfig with CdpClient.builder() ===");

    // The builder provides a fluent API with httpConfig for advanced configuration
    try (CdpClient cdp =
        CdpClient.builder()
            .credentials(getEnvOrProperty("CDP_API_KEY_ID"), getEnvOrProperty("CDP_API_KEY_SECRET"))
            .walletSecret(getEnvOrProperty("CDP_WALLET_SECRET"))
            .retryConfig(customConfig)
            .build()) {
      var accounts = cdp.evm().listAccounts();
      System.out.println("Successfully connected with builder pattern!");
      System.out.println("Found " + accounts.getAccounts().size() + " EVM accounts");
    }

    System.out.println();
    System.out.println("Retry configuration example completed successfully!");
  }

  /**
   * Gets a value from environment variables or system properties.
   *
   * <p>Environment variables take precedence over system properties. This matches the behavior of
   * CdpClientOptions.fromEnvironment().
   */
  private static String getEnvOrProperty(String name) {
    String value = System.getenv(name);
    if (value == null || value.isBlank()) {
      value = System.getProperty(name);
    }
    return value;
  }
}
