package com.coinbase.cdp;

import static org.assertj.core.api.Assertions.assertThat;

import com.coinbase.cdp.resources.evmaccounts.requests.ListEvmAccountsRequest;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.spec.ECGenParameterSpec;
import java.util.Base64;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.jupiter.api.Test;

class CdpAuthenticationTest {

  @Test
  void derivesBearerAuthenticationForGeneratedRequests() throws Exception {
    try (MockWebServer server = new MockWebServer()) {
      server.start();
      server.enqueue(new MockResponse().setResponseCode(200).setBody("{\"accounts\":[]}"));

      CdpClient client =
          CdpClient.builder()
              .url(server.url("/").toString())
              .credentials("test-api-key-id", generateEcPrivateKey())
              .build();

      client.evmAccounts().listEvmAccounts(ListEvmAccountsRequest.builder().build());

      RecordedRequest request = server.takeRequest();
      assertThat(request.getHeader("Authorization")).startsWith("Bearer ");
      assertThat(request.getHeader("X-Wallet-Auth")).isNull();
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
