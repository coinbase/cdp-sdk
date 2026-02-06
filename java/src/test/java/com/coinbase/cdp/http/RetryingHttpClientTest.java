package com.coinbase.cdp.http;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class RetryingHttpClientTest {

  private MockWebServer server;
  private HttpClient baseClient;

  @BeforeEach
  void setUp() throws IOException {
    server = new MockWebServer();
    server.start();
    baseClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
  }

  @AfterEach
  void tearDown() throws IOException {
    server.shutdown();
  }

  @Test
  void successfulRequestDoesNotRetry() throws Exception {
    server.enqueue(new MockResponse().setResponseCode(200).setBody("success"));

    RetryConfig config = RetryConfig.builder().maxRetries(3).build();
    RetryingHttpClient client = new RetryingHttpClient(baseClient, config);

    HttpRequest request = HttpRequest.newBuilder().uri(server.url("/test").uri()).GET().build();

    HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

    assertThat(response.statusCode()).isEqualTo(200);
    assertThat(response.body()).isEqualTo("success");
    assertThat(server.getRequestCount()).isEqualTo(1);
  }

  @Test
  void retriesOn503UntilSuccess() throws Exception {
    server.enqueue(new MockResponse().setResponseCode(503));
    server.enqueue(new MockResponse().setResponseCode(503));
    server.enqueue(new MockResponse().setResponseCode(200).setBody("success"));

    RetryConfig config =
        RetryConfig.builder()
            .maxRetries(3)
            .initialBackoff(Duration.ofMillis(10))
            .jitterFactor(0.0)
            .build();
    RetryingHttpClient client = new RetryingHttpClient(baseClient, config);

    HttpRequest request = HttpRequest.newBuilder().uri(server.url("/test").uri()).GET().build();

    HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

    assertThat(response.statusCode()).isEqualTo(200);
    assertThat(response.body()).isEqualTo("success");
    assertThat(server.getRequestCount()).isEqualTo(3);
  }

  @Test
  void retriesOn429RateLimitError() throws Exception {
    server.enqueue(new MockResponse().setResponseCode(429));
    server.enqueue(new MockResponse().setResponseCode(200).setBody("success"));

    RetryConfig config =
        RetryConfig.builder()
            .maxRetries(2)
            .initialBackoff(Duration.ofMillis(10))
            .jitterFactor(0.0)
            .build();
    RetryingHttpClient client = new RetryingHttpClient(baseClient, config);

    HttpRequest request = HttpRequest.newBuilder().uri(server.url("/test").uri()).GET().build();

    HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

    assertThat(response.statusCode()).isEqualTo(200);
    assertThat(server.getRequestCount()).isEqualTo(2);
  }

  @Test
  void doesNotRetryOn400ClientError() throws Exception {
    server.enqueue(new MockResponse().setResponseCode(400).setBody("bad request"));

    RetryConfig config = RetryConfig.builder().maxRetries(3).build();
    RetryingHttpClient client = new RetryingHttpClient(baseClient, config);

    HttpRequest request = HttpRequest.newBuilder().uri(server.url("/test").uri()).GET().build();

    HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

    assertThat(response.statusCode()).isEqualTo(400);
    assertThat(server.getRequestCount()).isEqualTo(1);
  }

  @Test
  void doesNotRetryPostWithoutIdempotencyKey() throws Exception {
    server.enqueue(new MockResponse().setResponseCode(503));

    RetryConfig config =
        RetryConfig.builder().maxRetries(3).initialBackoff(Duration.ofMillis(10)).build();
    RetryingHttpClient client = new RetryingHttpClient(baseClient, config);

    HttpRequest request =
        HttpRequest.newBuilder()
            .uri(server.url("/test").uri())
            .POST(HttpRequest.BodyPublishers.ofString("{}"))
            .header("Content-Type", "application/json")
            .build();

    HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

    assertThat(response.statusCode()).isEqualTo(503);
    assertThat(server.getRequestCount()).isEqualTo(1);
  }

  @Test
  void retriesPostWithIdempotencyKey() throws Exception {
    server.enqueue(new MockResponse().setResponseCode(503));
    server.enqueue(new MockResponse().setResponseCode(200).setBody("success"));

    RetryConfig config =
        RetryConfig.builder()
            .maxRetries(3)
            .initialBackoff(Duration.ofMillis(10))
            .jitterFactor(0.0)
            .build();
    RetryingHttpClient client = new RetryingHttpClient(baseClient, config);

    HttpRequest request =
        HttpRequest.newBuilder()
            .uri(server.url("/test").uri())
            .POST(HttpRequest.BodyPublishers.ofString("{}"))
            .header("Content-Type", "application/json")
            .header("X-Idempotency-Key", "test-key-123")
            .build();

    HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

    assertThat(response.statusCode()).isEqualTo(200);
    assertThat(server.getRequestCount()).isEqualTo(2);
  }

  @Test
  void stopsAfterMaxRetries() throws Exception {
    // Queue more failures than max retries
    server.enqueue(new MockResponse().setResponseCode(503));
    server.enqueue(new MockResponse().setResponseCode(503));
    server.enqueue(new MockResponse().setResponseCode(503));
    server.enqueue(new MockResponse().setResponseCode(503));
    server.enqueue(new MockResponse().setResponseCode(200).setBody("success"));

    RetryConfig config =
        RetryConfig.builder()
            .maxRetries(2)
            .initialBackoff(Duration.ofMillis(10))
            .jitterFactor(0.0)
            .build();
    RetryingHttpClient client = new RetryingHttpClient(baseClient, config);

    HttpRequest request = HttpRequest.newBuilder().uri(server.url("/test").uri()).GET().build();

    HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

    // Should return the last 503 after max retries exhausted
    assertThat(response.statusCode()).isEqualTo(503);
    // 1 initial + 2 retries = 3 total requests
    assertThat(server.getRequestCount()).isEqualTo(3);
  }

  @Test
  void respectsRetryAfterHeader() throws Exception {
    server.enqueue(new MockResponse().setResponseCode(429).setHeader("Retry-After", "1"));
    server.enqueue(new MockResponse().setResponseCode(200).setBody("success"));

    RetryConfig config =
        RetryConfig.builder()
            .maxRetries(2)
            .initialBackoff(Duration.ofMillis(10))
            .jitterFactor(0.0)
            .build();
    RetryingHttpClient client = new RetryingHttpClient(baseClient, config);

    HttpRequest request = HttpRequest.newBuilder().uri(server.url("/test").uri()).GET().build();

    long startTime = System.currentTimeMillis();
    HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
    long elapsed = System.currentTimeMillis() - startTime;

    assertThat(response.statusCode()).isEqualTo(200);
    // Should have waited at least 1 second due to Retry-After header
    assertThat(elapsed).isGreaterThanOrEqualTo(1000);
  }

  @Test
  void retriesIdempotentMethods() throws Exception {
    String[] methods = {"GET", "HEAD", "PUT", "DELETE", "OPTIONS"};

    for (String method : methods) {
      server.shutdown();
      server = new MockWebServer();
      server.start();

      server.enqueue(new MockResponse().setResponseCode(503));
      server.enqueue(new MockResponse().setResponseCode(200));

      RetryConfig config =
          RetryConfig.builder()
              .maxRetries(2)
              .initialBackoff(Duration.ofMillis(10))
              .jitterFactor(0.0)
              .build();
      RetryingHttpClient client = new RetryingHttpClient(baseClient, config);

      HttpRequest.Builder requestBuilder = HttpRequest.newBuilder().uri(server.url("/test").uri());

      if (method.equals("PUT")) {
        requestBuilder.PUT(HttpRequest.BodyPublishers.ofString("{}"));
      } else if (method.equals("DELETE")) {
        requestBuilder.DELETE();
      } else {
        requestBuilder.method(method, HttpRequest.BodyPublishers.noBody());
      }

      HttpRequest request = requestBuilder.build();
      HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

      assertThat(response.statusCode())
          .as("Method %s should retry and succeed", method)
          .isEqualTo(200);
      assertThat(server.getRequestCount())
          .as("Method %s should have made 2 requests", method)
          .isEqualTo(2);
    }
  }

  @Test
  void zeroMaxRetriesDisablesRetries() throws Exception {
    server.enqueue(new MockResponse().setResponseCode(503));

    RetryConfig config = RetryConfig.builder().maxRetries(0).build();
    RetryingHttpClient client = new RetryingHttpClient(baseClient, config);

    HttpRequest request = HttpRequest.newBuilder().uri(server.url("/test").uri()).GET().build();

    HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

    assertThat(response.statusCode()).isEqualTo(503);
    assertThat(server.getRequestCount()).isEqualTo(1);
  }

  @Test
  void appliesExponentialBackoff() throws Exception {
    server.enqueue(new MockResponse().setResponseCode(503));
    server.enqueue(new MockResponse().setResponseCode(503));
    server.enqueue(new MockResponse().setResponseCode(200).setBody("success"));

    RetryConfig config =
        RetryConfig.builder()
            .maxRetries(3)
            .initialBackoff(Duration.ofMillis(100))
            .backoffMultiplier(2.0)
            .jitterFactor(0.0)
            .build();
    RetryingHttpClient client = new RetryingHttpClient(baseClient, config);

    HttpRequest request = HttpRequest.newBuilder().uri(server.url("/test").uri()).GET().build();

    long startTime = System.currentTimeMillis();
    HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
    long elapsed = System.currentTimeMillis() - startTime;

    assertThat(response.statusCode()).isEqualTo(200);
    // First retry: 100ms, second retry: 200ms = 300ms total
    // Allow some tolerance for execution time
    assertThat(elapsed).isGreaterThanOrEqualTo(250);
  }

  @Test
  void delegatesHttpClientMethods() {
    RetryConfig config = RetryConfig.defaultConfig();
    RetryingHttpClient client = new RetryingHttpClient(baseClient, config);

    // Verify delegation methods work
    assertThat(client.connectTimeout()).isPresent();
    assertThat(client.version()).isNotNull();
    assertThat(client.followRedirects()).isNotNull();
    assertThat(client.sslContext()).isNotNull();
    assertThat(client.sslParameters()).isNotNull();
  }
}
