package com.coinbase.cdp.e2e;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.auth.TokenProvider;
import com.coinbase.cdp.http.RetryConfig;
import io.github.cdimascio.dotenv.Dotenv;
import java.util.Optional;
import java.util.Random;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.methods.response.TransactionReceipt;
import org.web3j.protocol.http.HttpService;

/** Shared test utilities for E2E tests. */
public final class TestUtils {

  private static final String CHARS = "abcdefghijklmnopqrstuvwxyz";
  private static final String CHARS_WITH_HYPHEN = "abcdefghijklmnopqrstuvwxyz-";
  private static final int MIN_NAME_LENGTH = 8;
  private static final int MAX_NAME_LENGTH = 16;
  private static final Random RANDOM = new Random();

  /** Base Sepolia RPC endpoint for transaction confirmation polling. */
  public static final String BASE_SEPOLIA_RPC = "https://sepolia.base.org";

  /** Solana Devnet RPC endpoint. */
  public static final String SOLANA_DEVNET_RPC = "https://api.devnet.solana.com";

  /**
   * Dotenv instance for loading environment variables from .env file. Configured to not throw if
   * .env file is missing (will fall back to system env vars).
   */
  private static final Dotenv DOTENV =
      Dotenv.configure().ignoreIfMissing().ignoreIfMalformed().load();

  private TestUtils() {}

  /**
   * Gets an environment variable, checking both .env file and system environment.
   *
   * <p>Priority: 1. System environment variable (allows overriding .env) 2. Value from .env file
   *
   * @param name the environment variable name
   * @return the value or null if not set
   */
  private static String getEnv(String name) {
    // System env takes priority (allows overriding .env values)
    String systemValue = System.getenv(name);
    if (systemValue != null && !systemValue.isBlank()) {
      return systemValue;
    }

    // Fall back to .env file
    String dotenvValue = DOTENV.get(name);
    if (dotenvValue != null && !dotenvValue.isBlank()) {
      return dotenvValue;
    }

    return null;
  }

  /**
   * Gets an environment variable or throws if not set.
   *
   * <p>Checks both .env file and system environment variables.
   *
   * @param name the environment variable name
   * @return the value
   * @throws IllegalStateException if the variable is not set
   */
  public static String getEnvOrThrow(String name) {
    String value = getEnv(name);
    if (value == null) {
      throw new IllegalStateException(
          "Environment variable "
              + name
              + " is required but not set. "
              + "Set it in your environment or in the java/.env file.");
    }
    return value;
  }

  /**
   * Gets an optional environment variable.
   *
   * <p>Checks both .env file and system environment variables.
   *
   * @param name the environment variable name
   * @return the optional value
   */
  public static Optional<String> getEnvOptional(String name) {
    String value = getEnv(name);
    return Optional.ofNullable(value);
  }

  /**
   * Creates a CdpClient from environment variables.
   *
   * <p>Note: CdpClient.create() only reads from system environment variables. For .env support, use
   * createClientFromEnv() instead.
   *
   * @return the client
   */
  public static CdpClient createDefaultClient() {
    return createClientFromEnv();
  }

  /**
   * Creates a CdpClient using environment variables from both .env file and system environment.
   *
   * @return the client
   */
  public static CdpClient createClientFromEnv() {
    String apiKeyId = getEnvOrThrow("CDP_API_KEY_ID");
    String apiKeySecret = getEnvOrThrow("CDP_API_KEY_SECRET");
    String walletSecret = getEnvOptional("CDP_WALLET_SECRET").orElse(null);

    return createClientWithCredentials(apiKeyId, apiKeySecret, walletSecret);
  }

  /**
   * Creates a CdpClient with explicit credentials using the builder pattern.
   *
   * @param apiKeyId the API key ID
   * @param apiKeySecret the API key secret
   * @param walletSecret the wallet secret (optional)
   * @return the client
   */
  public static CdpClient createClientWithCredentials(
      String apiKeyId, String apiKeySecret, String walletSecret) {
    var builder = CdpClient.builder().credentials(apiKeyId, apiKeySecret);
    if (walletSecret != null && !walletSecret.isBlank()) {
      builder.walletSecret(walletSecret);
    }
    return builder.build();
  }

  /**
   * Creates a CdpClient with a TokenProvider using the builder pattern.
   *
   * @param tokenProvider the token provider
   * @return the client
   */
  public static CdpClient createClientWithTokenProvider(TokenProvider tokenProvider) {
    return CdpClient.builder().tokenProvider(tokenProvider).build();
  }

  /**
   * Creates a CdpClient with custom retry configuration.
   *
   * @param apiKeyId the API key ID
   * @param apiKeySecret the API key secret
   * @param walletSecret the wallet secret (optional)
   * @param retryConfig the retry configuration
   * @return the client
   */
  public static CdpClient createClientWithRetryConfig(
      String apiKeyId, String apiKeySecret, String walletSecret, RetryConfig retryConfig) {
    var builder = CdpClient.builder().credentials(apiKeyId, apiKeySecret).retryConfig(retryConfig);
    if (walletSecret != null && !walletSecret.isBlank()) {
      builder.walletSecret(walletSecret);
    }
    return builder.build();
  }

  /**
   * Generates a random account name for testing.
   *
   * <p>The name follows the pattern: - Starts with a letter - Contains only lowercase letters and
   * hyphens - Ends with a letter - Length between 8 and 16 characters
   *
   * @return a random name
   */
  public static String generateRandomName() {
    int length = MIN_NAME_LENGTH + RANDOM.nextInt(MAX_NAME_LENGTH - MIN_NAME_LENGTH + 1);

    StringBuilder sb = new StringBuilder();

    // First character must be a letter
    sb.append(CHARS.charAt(RANDOM.nextInt(CHARS.length())));

    // Middle characters can include hyphens
    for (int i = 1; i < length - 1; i++) {
      sb.append(CHARS_WITH_HYPHEN.charAt(RANDOM.nextInt(CHARS_WITH_HYPHEN.length())));
    }

    // Last character must be a letter
    sb.append(CHARS.charAt(RANDOM.nextInt(CHARS.length())));

    return sb.toString();
  }

  /**
   * Sleeps for the specified number of milliseconds.
   *
   * @param millis the number of milliseconds to sleep
   */
  public static void sleep(long millis) {
    try {
      Thread.sleep(millis);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new RuntimeException("Sleep interrupted", e);
    }
  }

  /**
   * Waits for a transaction to be confirmed on Base Sepolia.
   *
   * <p>Polls the Base Sepolia RPC endpoint until the transaction receipt is available or timeout.
   *
   * @param transactionHash the transaction hash to wait for (0x-prefixed)
   * @throws Exception if the transaction is not confirmed within timeout or fails
   */
  public static void waitForTransactionReceipt(String transactionHash) throws Exception {
    int maxAttempts = 60; // 60 attempts
    int pollingIntervalMs = 2000; // 2 seconds between polls (total: 2 minutes max)

    Web3j web3j = Web3j.build(new HttpService(BASE_SEPOLIA_RPC));
    try {
      for (int attempt = 0; attempt < maxAttempts; attempt++) {
        Optional<TransactionReceipt> receipt =
            web3j.ethGetTransactionReceipt(transactionHash).send().getTransactionReceipt();

        if (receipt.isPresent()) {
          TransactionReceipt txReceipt = receipt.get();
          // Check if transaction was successful (status = "0x1")
          if ("0x1".equals(txReceipt.getStatus())) {
            return;
          } else {
            throw new RuntimeException("Transaction failed with status: " + txReceipt.getStatus());
          }
        }

        // Transaction not yet mined, wait and retry
        Thread.sleep(pollingIntervalMs);
      }

      throw new RuntimeException(
          "Timeout waiting for transaction confirmation after "
              + (maxAttempts * pollingIntervalMs / 1000)
              + " seconds");
    } finally {
      web3j.shutdown();
    }
  }

  /**
   * Generates a random hex string of the specified length.
   *
   * @param length the length of the hex string (will be prefixed with 0x)
   * @return the hex string
   */
  public static String generateRandomHex(int length) {
    StringBuilder sb = new StringBuilder("0x");
    for (int i = 0; i < length; i++) {
      sb.append(Integer.toHexString(RANDOM.nextInt(16)));
    }
    return sb.toString();
  }
}
