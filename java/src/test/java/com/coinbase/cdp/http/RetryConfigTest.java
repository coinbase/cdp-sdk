package com.coinbase.cdp.http;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.util.Set;
import org.junit.jupiter.api.Test;

class RetryConfigTest {

  @Test
  void defaultConfigHasExpectedValues() {
    RetryConfig config = RetryConfig.defaultConfig();

    assertThat(config.maxRetries()).isEqualTo(3);
    assertThat(config.initialBackoff()).isEqualTo(Duration.ofMillis(100));
    assertThat(config.maxBackoff()).isEqualTo(Duration.ofSeconds(30));
    assertThat(config.backoffMultiplier()).isEqualTo(2.0);
    assertThat(config.jitterFactor()).isEqualTo(0.25);
    assertThat(config.retryableStatusCodes()).containsExactlyInAnyOrder(429, 500, 502, 503, 504);
    assertThat(config.idempotentMethods())
        .containsExactlyInAnyOrder("GET", "HEAD", "PUT", "DELETE", "OPTIONS", "TRACE");
  }

  @Test
  void builderCreatesConfigWithCustomValues() {
    RetryConfig config =
        RetryConfig.builder()
            .maxRetries(5)
            .initialBackoff(Duration.ofMillis(200))
            .maxBackoff(Duration.ofSeconds(60))
            .backoffMultiplier(3.0)
            .jitterFactor(0.5)
            .retryableStatusCodes(Set.of(500, 503))
            .idempotentMethods(Set.of("GET", "PUT"))
            .build();

    assertThat(config.maxRetries()).isEqualTo(5);
    assertThat(config.initialBackoff()).isEqualTo(Duration.ofMillis(200));
    assertThat(config.maxBackoff()).isEqualTo(Duration.ofSeconds(60));
    assertThat(config.backoffMultiplier()).isEqualTo(3.0);
    assertThat(config.jitterFactor()).isEqualTo(0.5);
    assertThat(config.retryableStatusCodes()).containsExactlyInAnyOrder(500, 503);
    assertThat(config.idempotentMethods()).containsExactlyInAnyOrder("GET", "PUT");
  }

  @Test
  void withMaxRetriesCreatesConfigWithSpecifiedRetries() {
    RetryConfig config = RetryConfig.withMaxRetries(10);

    assertThat(config.maxRetries()).isEqualTo(10);
    assertThat(config.initialBackoff()).isEqualTo(Duration.ofMillis(100));
  }

  @Test
  void disabledCreatesConfigWithZeroRetries() {
    RetryConfig config = RetryConfig.disabled();

    assertThat(config.maxRetries()).isEqualTo(0);
  }

  @Test
  void builderWithZeroRetriesIsValid() {
    RetryConfig config = RetryConfig.builder().maxRetries(0).build();

    assertThat(config.maxRetries()).isEqualTo(0);
  }

  @Test
  void negativeMaxRetriesThrowsException() {
    assertThatThrownBy(() -> RetryConfig.builder().maxRetries(-1).build())
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("maxRetries must be non-negative");
  }

  @Test
  void negativeInitialBackoffThrowsException() {
    assertThatThrownBy(() -> RetryConfig.builder().initialBackoff(Duration.ofMillis(-1)).build())
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("initialBackoff must be non-negative");
  }

  @Test
  void negativeMaxBackoffThrowsException() {
    assertThatThrownBy(() -> RetryConfig.builder().maxBackoff(Duration.ofMillis(-1)).build())
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("maxBackoff must be non-negative");
  }

  @Test
  void backoffMultiplierLessThanOneThrowsException() {
    assertThatThrownBy(() -> RetryConfig.builder().backoffMultiplier(0.5).build())
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("backoffMultiplier must be >= 1.0");
  }

  @Test
  void jitterFactorOutOfRangeThrowsException() {
    assertThatThrownBy(() -> RetryConfig.builder().jitterFactor(-0.1).build())
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("jitterFactor must be between 0.0 and 1.0");

    assertThatThrownBy(() -> RetryConfig.builder().jitterFactor(1.5).build())
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("jitterFactor must be between 0.0 and 1.0");
  }

  @Test
  void jitterFactorAtBoundariesIsValid() {
    RetryConfig configZero = RetryConfig.builder().jitterFactor(0.0).build();
    assertThat(configZero.jitterFactor()).isEqualTo(0.0);

    RetryConfig configOne = RetryConfig.builder().jitterFactor(1.0).build();
    assertThat(configOne.jitterFactor()).isEqualTo(1.0);
  }
}
