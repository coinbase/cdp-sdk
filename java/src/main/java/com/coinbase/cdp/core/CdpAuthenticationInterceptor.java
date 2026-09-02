package com.coinbase.cdp.core;

import com.coinbase.cdp.auth.JwtGenerator;
import com.coinbase.cdp.auth.JwtOptions;
import com.coinbase.cdp.auth.WalletJwtGenerator;
import com.coinbase.cdp.auth.WalletJwtOptions;
import com.fasterxml.jackson.core.type.TypeReference;
import java.io.IOException;
import java.util.Map;
import java.util.Optional;
import okhttp3.Interceptor;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okio.Buffer;

/**
 * Adds CDP request-bound credentials to generated Java SDK requests.
 *
 * <p>The Fern-generated client attaches {@link EndpointMetadata} to each request from the OpenAPI
 * contract. This interceptor derives the bearer token for every request and adds wallet
 * authentication only where that metadata requires {@code X-Wallet-Auth}. Consequently, a newly
 * generated endpoint receives the appropriate request authentication without endpoint-specific
 * handwritten SDK code.
 */
public final class CdpAuthenticationInterceptor implements Interceptor {

  private static final String WALLET_AUTH_HEADER = "X-Wallet-Auth";

  private static final TypeReference<Map<String, Object>> REQUEST_BODY_TYPE =
      new TypeReference<>() {};

  private final String apiKeyId;
  private final String apiKeySecret;
  private final Optional<String> walletSecret;

  public CdpAuthenticationInterceptor(
      String apiKeyId, String apiKeySecret, Optional<String> walletSecret) {
    this.apiKeyId = apiKeyId;
    this.apiKeySecret = apiKeySecret;
    this.walletSecret = walletSecret == null ? Optional.empty() : walletSecret;
  }

  @Override
  public Response intercept(Chain chain) throws IOException {
    Request request = chain.request();
    Request.Builder authenticatedRequest = request.newBuilder();

    authenticatedRequest.header(
        "Authorization",
        "Bearer "
            + JwtGenerator.generateJwt(
                JwtOptions.builder(apiKeyId, apiKeySecret)
                    .requestMethod(request.method())
                    .requestHost(request.url().host())
                    .requestPath(request.url().encodedPath())
                    .build()));

    if (requiresWalletAuthentication(request)) {
      String configuredWalletSecret =
          walletSecret.orElseThrow(
              () ->
                  new IllegalStateException(
                      "A wallet secret is required for this operation. "
                          + "Configure it with CdpClient.builder().walletSecret(...)."));

      authenticatedRequest.header(
          WALLET_AUTH_HEADER,
          WalletJwtGenerator.generateWalletJwt(
              new WalletJwtOptions(
                  configuredWalletSecret,
                  request.method(),
                  request.url().host(),
                  request.url().encodedPath(),
                  requestBodyAsMap(request))));
    }

    return chain.proceed(authenticatedRequest.build());
  }

  private static boolean requiresWalletAuthentication(Request request) {
    EndpointMetadata metadata = request.tag(EndpointMetadata.class);
    return metadata != null
        && metadata.getRequiredHeaders().stream()
            .anyMatch(header -> WALLET_AUTH_HEADER.equalsIgnoreCase(header));
  }

  private static Map<String, Object> requestBodyAsMap(Request request) throws IOException {
    RequestBody requestBody = request.body();
    if (requestBody == null) {
      return Map.of();
    }

    try (Buffer buffer = new Buffer()) {
      requestBody.writeTo(buffer);
      return ObjectMappers.JSON_MAPPER.readValue(buffer.readUtf8(), REQUEST_BODY_TYPE);
    }
  }
}
