package com.coinbase.cdp.http;

import java.io.IOException;
import java.net.Authenticator;
import java.net.CookieHandler;
import java.net.ProxySelector;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.concurrent.ThreadLocalRandom;
import java.util.logging.Logger;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLParameters;

/**
 * An HttpClient wrapper that adds retry functionality with exponential backoff.
 *
 * <p>This client wraps a delegate HttpClient and transparently retries failed requests based on the
 * configured retry policy. Retries are performed for:
 *
 * <ul>
 *   <li>Network errors (IOException)
 *   <li>Retryable HTTP status codes (429, 5xx by default)
 * </ul>
 *
 * <p>Only idempotent HTTP methods are retried by default to ensure safety. POST requests are NOT
 * retried unless an X-Idempotency-Key header is present.
 *
 * <p>The retry strategy uses exponential backoff with jitter to prevent thundering herd problems.
 * For 429 (rate limit) responses, the Retry-After header is respected if present.
 */
public class RetryingHttpClient extends HttpClient {

  private static final Logger LOGGER = Logger.getLogger(RetryingHttpClient.class.getName());
  private static final String IDEMPOTENCY_KEY_HEADER = "X-Idempotency-Key";

  private final HttpClient delegate;
  private final RetryConfig config;
  private final boolean debugEnabled;

  /**
   * Creates a new RetryingHttpClient with the specified delegate and configuration.
   *
   * @param delegate the underlying HttpClient to delegate requests to
   * @param config the retry configuration
   */
  public RetryingHttpClient(HttpClient delegate, RetryConfig config) {
    this(delegate, config, false);
  }

  /**
   * Creates a new RetryingHttpClient with the specified delegate, configuration, and debug mode.
   *
   * @param delegate the underlying HttpClient to delegate requests to
   * @param config the retry configuration
   * @param debugEnabled whether to enable debug logging
   */
  public RetryingHttpClient(HttpClient delegate, RetryConfig config, boolean debugEnabled) {
    this.delegate = delegate;
    this.config = config;
    this.debugEnabled = debugEnabled;
  }

  @Override
  public <T> HttpResponse<T> send(
      HttpRequest request, HttpResponse.BodyHandler<T> responseBodyHandler)
      throws IOException, InterruptedException {

    int attempt = 0;
    IOException lastException = null;

    while (attempt <= config.maxRetries()) {
      try {
        HttpResponse<T> response = delegate.send(request, responseBodyHandler);

        if (shouldRetryResponse(request, response, attempt)) {
          attempt++;
          Duration delay = calculateBackoff(attempt, response);
          logRetry(request, attempt, response.statusCode(), null, delay);
          Thread.sleep(delay.toMillis());
          continue;
        }

        return response;

      } catch (IOException e) {
        lastException = e;

        if (!shouldRetryException(request, e, attempt)) {
          throw e;
        }

        attempt++;
        Duration delay = calculateBackoff(attempt, null);
        logRetry(request, attempt, -1, e, delay);
        Thread.sleep(delay.toMillis());
      }
    }

    // Max retries exceeded
    if (lastException != null) {
      throw lastException;
    }
    throw new IOException("Max retries exceeded");
  }

  private boolean shouldRetryResponse(HttpRequest request, HttpResponse<?> response, int attempt) {
    if (attempt >= config.maxRetries()) {
      return false;
    }

    if (!isRetryableMethod(request)) {
      if (debugEnabled) {
        LOGGER.fine(
            () ->
                String.format(
                    "Not retrying %s %s: method is not idempotent and no idempotency key present",
                    request.method(), request.uri()));
      }
      return false;
    }

    return config.retryableStatusCodes().contains(response.statusCode());
  }

  private boolean shouldRetryException(HttpRequest request, IOException e, int attempt) {
    if (attempt >= config.maxRetries()) {
      return false;
    }

    return isRetryableMethod(request);
  }

  private boolean isRetryableMethod(HttpRequest request) {
    String method = request.method();

    // Idempotent methods are always safe to retry
    if (config.idempotentMethods().contains(method)) {
      return true;
    }

    // POST with idempotency key is safe to retry
    if ("POST".equals(method) && hasIdempotencyKey(request)) {
      return true;
    }

    return false;
  }

  private boolean hasIdempotencyKey(HttpRequest request) {
    return request.headers().firstValue(IDEMPOTENCY_KEY_HEADER).isPresent();
  }

  private Duration calculateBackoff(int attempt, HttpResponse<?> response) {
    // Check for Retry-After header (for 429 responses)
    if (response != null) {
      Optional<String> retryAfter = response.headers().firstValue("Retry-After");
      if (retryAfter.isPresent()) {
        try {
          long seconds = Long.parseLong(retryAfter.get());
          return Duration.ofSeconds(Math.min(seconds, config.maxBackoff().toSeconds()));
        } catch (NumberFormatException ignored) {
          // Fall through to exponential backoff
        }
      }
    }

    // Exponential backoff: initialBackoff * (multiplier ^ (attempt - 1))
    double exponentialBackoffMs =
        config.initialBackoff().toMillis() * Math.pow(config.backoffMultiplier(), attempt - 1);

    // Apply jitter: random value between (1 - jitter) and (1 + jitter)
    double jitterMultiplier =
        1.0 + (ThreadLocalRandom.current().nextDouble() - 0.5) * 2 * config.jitterFactor();

    long delayMs = (long) (exponentialBackoffMs * jitterMultiplier);

    // Cap at max backoff
    delayMs = Math.min(delayMs, config.maxBackoff().toMillis());

    return Duration.ofMillis(delayMs);
  }

  private void logRetry(
      HttpRequest request, int attempt, int statusCode, IOException exception, Duration delay) {
    if (debugEnabled) {
      String reason =
          statusCode > 0
              ? String.format("status code %d", statusCode)
              : String.format("exception: %s", exception.getMessage());

      LOGGER.info(
          () ->
              String.format(
                  "Retrying %s %s (attempt %d/%d) after %dms due to %s",
                  request.method(),
                  request.uri(),
                  attempt,
                  config.maxRetries(),
                  delay.toMillis(),
                  reason));
    }
  }

  // ==================== Delegate methods to underlying HttpClient ====================

  @Override
  public Optional<CookieHandler> cookieHandler() {
    return delegate.cookieHandler();
  }

  @Override
  public Optional<Duration> connectTimeout() {
    return delegate.connectTimeout();
  }

  @Override
  public Redirect followRedirects() {
    return delegate.followRedirects();
  }

  @Override
  public Optional<ProxySelector> proxy() {
    return delegate.proxy();
  }

  @Override
  public SSLContext sslContext() {
    return delegate.sslContext();
  }

  @Override
  public SSLParameters sslParameters() {
    return delegate.sslParameters();
  }

  @Override
  public Optional<Authenticator> authenticator() {
    return delegate.authenticator();
  }

  @Override
  public Version version() {
    return delegate.version();
  }

  @Override
  public Optional<Executor> executor() {
    return delegate.executor();
  }

  @Override
  public <T> CompletableFuture<HttpResponse<T>> sendAsync(
      HttpRequest request, HttpResponse.BodyHandler<T> responseBodyHandler) {
    return sendAsyncWithRetry(request, responseBodyHandler, 0);
  }

  @Override
  public <T> CompletableFuture<HttpResponse<T>> sendAsync(
      HttpRequest request,
      HttpResponse.BodyHandler<T> responseBodyHandler,
      HttpResponse.PushPromiseHandler<T> pushPromiseHandler) {
    // Push promise handler is not commonly used; delegate without retry for simplicity
    return delegate.sendAsync(request, responseBodyHandler, pushPromiseHandler);
  }

  private <T> CompletableFuture<HttpResponse<T>> sendAsyncWithRetry(
      HttpRequest request, HttpResponse.BodyHandler<T> responseBodyHandler, int attempt) {

    return delegate
        .sendAsync(request, responseBodyHandler)
        .thenCompose(
            response -> {
              if (shouldRetryResponse(request, response, attempt)) {
                int nextAttempt = attempt + 1;
                Duration delay = calculateBackoff(nextAttempt, response);
                logRetry(request, nextAttempt, response.statusCode(), null, delay);

                return CompletableFuture.supplyAsync(
                        () -> null,
                        CompletableFuture.delayedExecutor(
                            delay.toMillis(), java.util.concurrent.TimeUnit.MILLISECONDS))
                    .thenCompose(
                        ignored -> sendAsyncWithRetry(request, responseBodyHandler, nextAttempt));
              }
              return CompletableFuture.completedFuture(response);
            })
        .exceptionallyCompose(
            throwable -> {
              Throwable cause = throwable.getCause();
              if (cause instanceof IOException ioException) {
                if (shouldRetryException(request, ioException, attempt)) {
                  int nextAttempt = attempt + 1;
                  Duration delay = calculateBackoff(nextAttempt, null);
                  logRetry(request, nextAttempt, -1, ioException, delay);

                  return CompletableFuture.supplyAsync(
                          () -> null,
                          CompletableFuture.delayedExecutor(
                              delay.toMillis(), java.util.concurrent.TimeUnit.MILLISECONDS))
                      .thenCompose(
                          ignored -> sendAsyncWithRetry(request, responseBodyHandler, nextAttempt));
                }
              }
              return CompletableFuture.failedFuture(throwable);
            });
  }
}
