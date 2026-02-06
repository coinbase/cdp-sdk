package com.coinbase.cdp.http;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.http.HttpClient;
import java.time.Duration;
import org.junit.jupiter.api.Test;

class HttpClientConfigTest {

  @Test
  void defaultsHasExpectedValues() {
    HttpClientConfig config = HttpClientConfig.defaults();

    assertThat(config.basePath()).isEqualTo("https://api.cdp.coinbase.com/platform");
    assertThat(config.retryConfig()).isEmpty();
    assertThat(config.httpClientBuilder()).isEmpty();
    assertThat(config.debugging()).isFalse();
  }

  @Test
  void withBasePathCreatesConfigWithCustomBasePath() {
    HttpClientConfig config = HttpClientConfig.withBasePath("https://custom.api.com");

    assertThat(config.basePath()).isEqualTo("https://custom.api.com");
    assertThat(config.retryConfig()).isEmpty();
    assertThat(config.debugging()).isFalse();
  }

  @Test
  void withoutRetriesCreatesConfigWithDisabledRetries() {
    HttpClientConfig config = HttpClientConfig.withoutRetries();

    assertThat(config.retryConfig()).isPresent();
    assertThat(config.retryConfig().get().maxRetries()).isEqualTo(0);
  }

  @Test
  void builderCreatesConfigWithAllOptions() {
    RetryConfig retryConfig =
        RetryConfig.builder().maxRetries(5).initialBackoff(Duration.ofMillis(200)).build();

    HttpClient.Builder httpBuilder = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10));

    HttpClientConfig config =
        HttpClientConfig.builder()
            .basePath("https://custom.api.com")
            .retryConfig(retryConfig)
            .httpClientBuilder(httpBuilder)
            .debugging(true)
            .build();

    assertThat(config.basePath()).isEqualTo("https://custom.api.com");
    assertThat(config.retryConfig()).isPresent();
    assertThat(config.retryConfig().get().maxRetries()).isEqualTo(5);
    assertThat(config.httpClientBuilder()).isPresent();
    assertThat(config.debugging()).isTrue();
  }

  @Test
  void builderWithDefaultsUsesDefaultBasePath() {
    HttpClientConfig config = HttpClientConfig.builder().build();

    assertThat(config.basePath()).isEqualTo(HttpClientConfig.DEFAULT_BASE_PATH);
  }

  @Test
  void nullBasePathUsesDefault() {
    HttpClientConfig config = new HttpClientConfig(null, null, null, false);

    assertThat(config.basePath()).isEqualTo(HttpClientConfig.DEFAULT_BASE_PATH);
  }

  @Test
  void blankBasePathUsesDefault() {
    HttpClientConfig config = new HttpClientConfig("  ", null, null, false);

    assertThat(config.basePath()).isEqualTo(HttpClientConfig.DEFAULT_BASE_PATH);
  }

  @Test
  void nullRetryConfigBecomesEmpty() {
    HttpClientConfig config = new HttpClientConfig("https://api.com", null, null, false);

    assertThat(config.retryConfig()).isEmpty();
  }

  @Test
  void nullHttpClientBuilderBecomesEmpty() {
    HttpClientConfig config = new HttpClientConfig("https://api.com", null, null, false);

    assertThat(config.httpClientBuilder()).isEmpty();
  }

  @Test
  void builderRetryConfigCanBeSetToNull() {
    HttpClientConfig config =
        HttpClientConfig.builder()
            .retryConfig(RetryConfig.defaultConfig())
            .retryConfig(null)
            .build();

    assertThat(config.retryConfig()).isEmpty();
  }

  @Test
  void builderHttpClientBuilderCanBeSetToNull() {
    HttpClientConfig config =
        HttpClientConfig.builder()
            .httpClientBuilder(HttpClient.newBuilder())
            .httpClientBuilder(null)
            .build();

    assertThat(config.httpClientBuilder()).isEmpty();
  }
}
