package com.coinbase.cdp;

import static org.assertj.core.api.Assertions.assertThat;

import com.coinbase.cdp.core.ObjectMappers;
import com.coinbase.cdp.resources.accounts.requests.ListFoundationAccountsRequest;
import com.coinbase.cdp.types.DepositDestinationTarget;
import com.coinbase.cdp.types.DepositDestinationTargetAccount;
import com.coinbase.cdp.types.DepositDestinationTargetOnchainAddress;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.spec.ECGenParameterSpec;
import java.util.Base64;
import java.util.List;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.jupiter.api.Test;

class FlexibleCustodyClientTest {

  @Test
  void serializesMultipleAccountOwnersAsOneCommaSeparatedQueryValue() throws Exception {
    try (MockWebServer server = new MockWebServer()) {
      server.start();
      server.enqueue(new MockResponse().setResponseCode(200).setBody("{\"accounts\":[]}"));

      CdpClient client =
          CdpClient.builder()
              .url(server.url("/").toString())
              .credentials("test-api-key-id", generateEcPrivateKey())
              .build();
      client
          .accounts()
          .listFoundationAccounts(
              ListFoundationAccountsRequest.builder()
                  .owner(List.of("entity", "customer_af2937b0-9846-4fe7-bfe9-ccc22d935114"))
                  .build());

      RecordedRequest request = server.takeRequest();
      assertThat(request.getRequestUrl().queryParameterValues("owner"))
          .containsExactly("entity,customer_af2937b0-9846-4fe7-bfe9-ccc22d935114");
    }
  }

  @Test
  void deserializesOnchainDepositTargetsBeforeTheBroaderAccountVariant() throws Exception {
    DepositDestinationTarget target =
        ObjectMappers.JSON_MAPPER.readValue(
            "{\"address\":\"0x833589fCD6EDB6E08f4c7C32D4f71b54bdA02913\","
                + "\"network\":\"base\",\"asset\":\"usdc\"}",
            DepositDestinationTarget.class);

    String variant =
        target.visit(
            new DepositDestinationTarget.Visitor<>() {
              @Override
              public String visit(DepositDestinationTargetAccount value) {
                return "account";
              }

              @Override
              public String visit(DepositDestinationTargetOnchainAddress value) {
                return "onchain";
              }
            });

    assertThat(variant).isEqualTo("onchain");
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
