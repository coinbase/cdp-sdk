package com.coinbase.cdp.auth;

import static org.assertj.core.api.Assertions.*;

import java.util.Map;
import org.junit.jupiter.api.Test;

class CdpTokenRequestTest {

  @Test
  void buildsWithRequiredFields() {
    CdpTokenRequest request =
        CdpTokenRequest.builder().requestMethod("GET").requestPath("/v2/evm/accounts").build();

    assertThat(request.requestMethod()).isEqualTo("GET");
    assertThat(request.requestPath()).isEqualTo("/v2/evm/accounts");
    assertThat(request.requestHost()).isEqualTo(CdpTokenRequest.DEFAULT_HOST);
    assertThat(request.includeWalletAuthToken()).isFalse();
    assertThat(request.requestBody()).isEmpty();
  }

  @Test
  void buildsWithAllFields() {
    Map<String, Object> body = Map.of("name", "test-account");

    CdpTokenRequest request =
        CdpTokenRequest.builder()
            .requestMethod("POST")
            .requestHost("custom.host.com")
            .requestPath("/v2/evm/accounts")
            .includeWalletAuthToken(true)
            .requestBody(body)
            .build();

    assertThat(request.requestMethod()).isEqualTo("POST");
    assertThat(request.requestHost()).isEqualTo("custom.host.com");
    assertThat(request.requestPath()).isEqualTo("/v2/evm/accounts");
    assertThat(request.includeWalletAuthToken()).isTrue();
    assertThat(request.requestBody()).isPresent();
    assertThat(request.requestBody().get()).isEqualTo(body);
  }

  @Test
  void acceptsPojoRequestBody() {
    // Simple POJO to simulate generated OpenAPI types
    record TestRequest(String name, int value) {}

    TestRequest pojo = new TestRequest("test-account", 42);

    CdpTokenRequest request =
        CdpTokenRequest.builder()
            .requestMethod("POST")
            .requestPath("/v2/evm/accounts")
            .includeWalletAuthToken(true)
            .requestBody(pojo)
            .build();

    assertThat(request.requestBody()).isPresent();
    assertThat(request.requestBody().get()).isEqualTo(pojo);
  }

  @Test
  void usesDefaultHostWhenNotProvided() {
    CdpTokenRequest request =
        CdpTokenRequest.builder().requestMethod("GET").requestPath("/v2/evm/accounts").build();

    assertThat(request.requestHost()).isEqualTo("api.cdp.coinbase.com");
  }

  @Test
  void usesDefaultHostWhenBlank() {
    CdpTokenRequest request =
        CdpTokenRequest.builder()
            .requestMethod("GET")
            .requestHost("  ")
            .requestPath("/v2/evm/accounts")
            .build();

    assertThat(request.requestHost()).isEqualTo("api.cdp.coinbase.com");
  }

  @Test
  void rejectsNullRequestMethod() {
    assertThatThrownBy(() -> CdpTokenRequest.builder().requestPath("/v2/evm/accounts").build())
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("requestMethod is required");
  }

  @Test
  void rejectsBlankRequestMethod() {
    assertThatThrownBy(
            () ->
                CdpTokenRequest.builder()
                    .requestMethod("  ")
                    .requestPath("/v2/evm/accounts")
                    .build())
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("requestMethod is required");
  }

  @Test
  void rejectsNullRequestPath() {
    assertThatThrownBy(() -> CdpTokenRequest.builder().requestMethod("GET").build())
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("requestPath is required");
  }

  @Test
  void rejectsBlankRequestPath() {
    assertThatThrownBy(
            () -> CdpTokenRequest.builder().requestMethod("GET").requestPath("  ").build())
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("requestPath is required");
  }

  @Test
  void includeWalletAuthTokenDefaultsToFalse() {
    CdpTokenRequest request =
        CdpTokenRequest.builder().requestMethod("GET").requestPath("/v2/evm/accounts").build();

    assertThat(request.includeWalletAuthToken()).isFalse();
  }

  @Test
  void requestBodyDefaultsToEmpty() {
    CdpTokenRequest request =
        CdpTokenRequest.builder().requestMethod("GET").requestPath("/v2/evm/accounts").build();

    assertThat(request.requestBody()).isEmpty();
  }

  @Test
  void handlesNullRequestBody() {
    CdpTokenRequest request =
        CdpTokenRequest.builder()
            .requestMethod("POST")
            .requestPath("/v2/evm/accounts")
            .requestBody(null)
            .build();

    assertThat(request.requestBody()).isEmpty();
  }
}
