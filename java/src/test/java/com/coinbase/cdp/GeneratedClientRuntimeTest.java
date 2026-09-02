package com.coinbase.cdp;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.coinbase.cdp.core.CdpClientException;
import com.coinbase.cdp.core.InputStreamRequestBody;
import com.coinbase.cdp.core.RetryInterceptor;
import java.io.ByteArrayInputStream;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.spec.ECGenParameterSpec;
import java.util.Base64;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import org.junit.jupiter.api.Test;

class GeneratedClientRuntimeTest {

  @Test
  void customHttpClientHonorsConfiguredRetries() throws Exception {
    try (MockWebServer server = new MockWebServer()) {
      server.start();
      server.enqueue(new MockResponse().setResponseCode(503));
      server.enqueue(new MockResponse().setResponseCode(200).setBody("{\"accounts\":[]}"));

      CdpClient client =
          CdpClient.builder()
              .url(server.url("/").toString())
              .credentials("test-api-key-id", generateEcPrivateKey())
              .httpClient(new OkHttpClient())
              .maxRetries(1)
              .build();

      assertThat(client.evmAccounts().listEvmAccounts().getAccounts()).isEmpty();
      assertThat(server.getRequestCount()).isEqualTo(2);
    }
  }

  @Test
  void retryInterceptorDoesNotReplayPostWithoutIdempotencyKey() throws Exception {
    try (MockWebServer server = new MockWebServer()) {
      server.start();
      server.enqueue(new MockResponse().setResponseCode(503));
      server.enqueue(new MockResponse().setResponseCode(200));

      OkHttpClient client =
          new OkHttpClient.Builder().addInterceptor(new RetryInterceptor(1)).build();
      Request request =
          new Request.Builder()
              .url(server.url("/"))
              .post(RequestBody.create("{}", MediaType.get("application/json")))
              .build();

      try (Response response = client.newCall(request).execute()) {
        assertThat(response.code()).isEqualTo(503);
      }
      assertThat(server.getRequestCount()).isEqualTo(1);
    }
  }

  @Test
  void inputStreamRequestBodyDoesNotAdvertiseAvailableBytesAsContentLength() throws Exception {
    InputStreamRequestBody body =
        new InputStreamRequestBody(
            MediaType.get("application/octet-stream"), new ByteArrayInputStream(new byte[8]));

    assertThat(body.contentLength()).isEqualTo(-1);
  }

  @Test
  void malformedSuccessfulResponseIsReportedAsDecodeFailure() throws Exception {
    try (MockWebServer server = new MockWebServer()) {
      server.start();
      server.enqueue(new MockResponse().setResponseCode(200).setBody("{\"accounts\":"));

      CdpClient client =
          CdpClient.builder()
              .url(server.url("/").toString())
              .credentials("test-api-key-id", generateEcPrivateKey())
              .build();

      assertThatThrownBy(() -> client.evmAccounts().listEvmAccounts())
          .isInstanceOf(CdpClientException.class)
          .hasMessage("Failed to decode HTTP response");
    }
  }

  private static String generateEcPrivateKey() throws Exception {
    KeyPairGenerator generator = KeyPairGenerator.getInstance("EC");
    generator.initialize(new ECGenParameterSpec("secp256r1"));
    KeyPair keyPair = generator.generateKeyPair();
    String encoded =
        Base64.getMimeEncoder(64, "\n".getBytes())
            .encodeToString(keyPair.getPrivate().getEncoded());
    return "-----BEGIN PRIVATE KEY-----\n" + encoded + "\n-----END PRIVATE KEY-----\n";
  }
}
