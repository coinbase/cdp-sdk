package com.coinbase.cdp.http;

import java.net.Authenticator;
import java.net.CookieHandler;
import java.net.ProxySelector;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.concurrent.Executor;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLParameters;

/**
 * An HttpClient.Builder that always returns a pre-configured HttpClient.
 *
 * <p>This class is needed because the ApiClient's getHttpClient() method calls builder.build(), and
 * we want to return our pre-wrapped RetryingHttpClient. All setter methods are no-ops since the
 * client is already built and configured.
 *
 * <p>This allows us to inject a fully configured HttpClient (with retry logic applied) into the
 * ApiClient without modifying the generated code.
 */
public class DelegatingHttpClientBuilder implements HttpClient.Builder {

  private final HttpClient prebuiltClient;

  /**
   * Creates a new DelegatingHttpClientBuilder that always returns the specified client.
   *
   * @param prebuiltClient the pre-configured HttpClient to return from build()
   */
  public DelegatingHttpClientBuilder(HttpClient prebuiltClient) {
    this.prebuiltClient = prebuiltClient;
  }

  @Override
  public HttpClient build() {
    return prebuiltClient;
  }

  // All setter methods are no-ops since client is already built

  @Override
  public HttpClient.Builder cookieHandler(CookieHandler cookieHandler) {
    return this;
  }

  @Override
  public HttpClient.Builder connectTimeout(Duration duration) {
    return this;
  }

  @Override
  public HttpClient.Builder sslContext(SSLContext sslContext) {
    return this;
  }

  @Override
  public HttpClient.Builder sslParameters(SSLParameters sslParameters) {
    return this;
  }

  @Override
  public HttpClient.Builder executor(Executor executor) {
    return this;
  }

  @Override
  public HttpClient.Builder followRedirects(HttpClient.Redirect policy) {
    return this;
  }

  @Override
  public HttpClient.Builder version(HttpClient.Version version) {
    return this;
  }

  @Override
  public HttpClient.Builder priority(int priority) {
    return this;
  }

  @Override
  public HttpClient.Builder proxy(ProxySelector proxySelector) {
    return this;
  }

  @Override
  public HttpClient.Builder authenticator(Authenticator authenticator) {
    return this;
  }
}
