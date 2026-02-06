package com.coinbase.cdp.http;

import java.time.Duration;
import java.util.Set;

/**
 * Configuration for HTTP retry behavior.
 *
 * <p>This class configures how the SDK handles retrying failed HTTP requests. It supports
 * exponential backoff with jitter, configurable retry conditions, and idempotency safety.
 *
 * <p>Example usage:
 *
 * <pre>{@code
 * // Use defaults (3 retries, exponential backoff)
 * RetryConfig config = RetryConfig.defaultConfig();
 *
 * // Custom configuration
 * RetryConfig config = RetryConfig.builder()
 *     .maxRetries(5)
 *     .initialBackoff(Duration.ofMillis(200))
 *     .maxBackoff(Duration.ofSeconds(60))
 *     .backoffMultiplier(2.0)
 *     .jitterFactor(0.3)
 *     .build();
 *
 * // Disable retries
 * RetryConfig config = RetryConfig.builder()
 *     .maxRetries(0)
 *     .build();
 * }</pre>
 */
public record RetryConfig(
    int maxRetries,
    Duration initialBackoff,
    Duration maxBackoff,
    double backoffMultiplier,
    double jitterFactor,
    Set<Integer> retryableStatusCodes,
    Set<String> idempotentMethods) {

  /** Default maximum number of retry attempts. */
  public static final int DEFAULT_MAX_RETRIES = 3;

  /** Default initial backoff duration (100ms). */
  public static final Duration DEFAULT_INITIAL_BACKOFF = Duration.ofMillis(100);

  /** Default maximum backoff duration (30 seconds). */
  public static final Duration DEFAULT_MAX_BACKOFF = Duration.ofSeconds(30);

  /** Default backoff multiplier for exponential backoff. */
  public static final double DEFAULT_BACKOFF_MULTIPLIER = 2.0;

  /** Default jitter factor (25% randomization). */
  public static final double DEFAULT_JITTER_FACTOR = 0.25;

  /** Default HTTP status codes that are safe to retry (rate limiting + server errors). */
  public static final Set<Integer> DEFAULT_RETRYABLE_STATUS_CODES = Set.of(429, 500, 502, 503, 504);

  /** Default HTTP methods that are safe to retry (idempotent methods). */
  public static final Set<String> DEFAULT_IDEMPOTENT_METHODS =
      Set.of("GET", "HEAD", "PUT", "DELETE", "OPTIONS", "TRACE");

  /**
   * Validates the retry configuration.
   *
   * @throws IllegalArgumentException if validation fails
   */
  public RetryConfig {
    if (maxRetries < 0) {
      throw new IllegalArgumentException("maxRetries must be non-negative");
    }
    if (initialBackoff == null) {
      initialBackoff = DEFAULT_INITIAL_BACKOFF;
    }
    if (initialBackoff.isNegative()) {
      throw new IllegalArgumentException("initialBackoff must be non-negative");
    }
    if (maxBackoff == null) {
      maxBackoff = DEFAULT_MAX_BACKOFF;
    }
    if (maxBackoff.isNegative()) {
      throw new IllegalArgumentException("maxBackoff must be non-negative");
    }
    if (backoffMultiplier < 1.0) {
      throw new IllegalArgumentException("backoffMultiplier must be >= 1.0");
    }
    if (jitterFactor < 0.0 || jitterFactor > 1.0) {
      throw new IllegalArgumentException("jitterFactor must be between 0.0 and 1.0");
    }
    if (retryableStatusCodes == null) {
      retryableStatusCodes = DEFAULT_RETRYABLE_STATUS_CODES;
    }
    if (idempotentMethods == null) {
      idempotentMethods = DEFAULT_IDEMPOTENT_METHODS;
    }
  }

  /**
   * Creates a RetryConfig with default settings.
   *
   * <p>Default configuration:
   *
   * <ul>
   *   <li>maxRetries: 3
   *   <li>initialBackoff: 100ms
   *   <li>maxBackoff: 30s
   *   <li>backoffMultiplier: 2.0
   *   <li>jitterFactor: 0.25 (25%)
   *   <li>retryableStatusCodes: 429, 500, 502, 503, 504
   *   <li>idempotentMethods: GET, HEAD, PUT, DELETE, OPTIONS, TRACE
   * </ul>
   *
   * @return the default retry configuration
   */
  public static RetryConfig defaultConfig() {
    return new RetryConfig(
        DEFAULT_MAX_RETRIES,
        DEFAULT_INITIAL_BACKOFF,
        DEFAULT_MAX_BACKOFF,
        DEFAULT_BACKOFF_MULTIPLIER,
        DEFAULT_JITTER_FACTOR,
        DEFAULT_RETRYABLE_STATUS_CODES,
        DEFAULT_IDEMPOTENT_METHODS);
  }

  /**
   * Creates a RetryConfig with the specified max retries and default settings for everything else.
   *
   * @param maxRetries the maximum number of retry attempts
   * @return a retry configuration with the specified max retries
   */
  public static RetryConfig withMaxRetries(int maxRetries) {
    return builder().maxRetries(maxRetries).build();
  }

  /**
   * Creates a RetryConfig that disables retries.
   *
   * @return a retry configuration with retries disabled
   */
  public static RetryConfig disabled() {
    return builder().maxRetries(0).build();
  }

  /**
   * Creates a new builder for RetryConfig.
   *
   * @return a new builder instance
   */
  public static Builder builder() {
    return new Builder();
  }

  /** Builder for RetryConfig. */
  public static class Builder {
    private int maxRetries = DEFAULT_MAX_RETRIES;
    private Duration initialBackoff = DEFAULT_INITIAL_BACKOFF;
    private Duration maxBackoff = DEFAULT_MAX_BACKOFF;
    private double backoffMultiplier = DEFAULT_BACKOFF_MULTIPLIER;
    private double jitterFactor = DEFAULT_JITTER_FACTOR;
    private Set<Integer> retryableStatusCodes = DEFAULT_RETRYABLE_STATUS_CODES;
    private Set<String> idempotentMethods = DEFAULT_IDEMPOTENT_METHODS;

    /**
     * Sets the maximum number of retry attempts.
     *
     * <p>Set to 0 to disable retries.
     *
     * @param maxRetries the maximum number of retries (default: 3)
     * @return this builder
     */
    public Builder maxRetries(int maxRetries) {
      this.maxRetries = maxRetries;
      return this;
    }

    /**
     * Sets the initial backoff duration before the first retry.
     *
     * @param initialBackoff the initial backoff duration (default: 100ms)
     * @return this builder
     */
    public Builder initialBackoff(Duration initialBackoff) {
      this.initialBackoff = initialBackoff;
      return this;
    }

    /**
     * Sets the maximum backoff duration.
     *
     * <p>The backoff will not exceed this value regardless of the number of retries.
     *
     * @param maxBackoff the maximum backoff duration (default: 30s)
     * @return this builder
     */
    public Builder maxBackoff(Duration maxBackoff) {
      this.maxBackoff = maxBackoff;
      return this;
    }

    /**
     * Sets the multiplier for exponential backoff.
     *
     * <p>Each retry will wait: initialBackoff * (multiplier ^ attemptNumber)
     *
     * @param backoffMultiplier the backoff multiplier (default: 2.0)
     * @return this builder
     */
    public Builder backoffMultiplier(double backoffMultiplier) {
      this.backoffMultiplier = backoffMultiplier;
      return this;
    }

    /**
     * Sets the jitter factor for randomizing backoff.
     *
     * <p>Jitter helps prevent thundering herd problems by randomizing retry timing. A value of 0.25
     * means the actual backoff will be within +/- 25% of the calculated value.
     *
     * @param jitterFactor the jitter factor between 0.0 and 1.0 (default: 0.25)
     * @return this builder
     */
    public Builder jitterFactor(double jitterFactor) {
      this.jitterFactor = jitterFactor;
      return this;
    }

    /**
     * Sets the HTTP status codes that should trigger a retry.
     *
     * <p>Default retryable codes: 429 (rate limit), 500, 502, 503, 504 (server errors)
     *
     * @param statusCodes the set of retryable status codes
     * @return this builder
     */
    public Builder retryableStatusCodes(Set<Integer> statusCodes) {
      this.retryableStatusCodes = statusCodes;
      return this;
    }

    /**
     * Sets the HTTP methods that are considered idempotent and safe to retry.
     *
     * <p>Default idempotent methods: GET, HEAD, PUT, DELETE, OPTIONS, TRACE
     *
     * <p>Note: POST requests are only retried if they include an X-Idempotency-Key header.
     *
     * @param methods the set of idempotent HTTP methods
     * @return this builder
     */
    public Builder idempotentMethods(Set<String> methods) {
      this.idempotentMethods = methods;
      return this;
    }

    /**
     * Builds the RetryConfig instance.
     *
     * @return the RetryConfig
     * @throws IllegalArgumentException if validation fails
     */
    public RetryConfig build() {
      return new RetryConfig(
          maxRetries,
          initialBackoff,
          maxBackoff,
          backoffMultiplier,
          jitterFactor,
          retryableStatusCodes,
          idempotentMethods);
    }
  }
}
