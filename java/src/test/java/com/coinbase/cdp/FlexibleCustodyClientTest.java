package com.coinbase.cdp;

import static org.assertj.core.api.Assertions.assertThat;

import com.coinbase.cdp.core.ObjectMappers;
import com.coinbase.cdp.resources.accounts.requests.CreateAccountRequest;
import com.coinbase.cdp.resources.accounts.requests.ListAccountsRequest;
import com.coinbase.cdp.types.AccountName;
import com.coinbase.cdp.types.DepositDestinationTarget;
import com.coinbase.cdp.types.DepositDestinationTargetAccount;
import com.coinbase.cdp.types.DepositDestinationTargetOnchainAddress;
import com.coinbase.cdp.types.Owner;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.spec.ECGenParameterSpec;
import java.util.Base64;
import java.util.List;
import java.util.concurrent.TimeUnit;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class FlexibleCustodyClientTest {

  @ParameterizedTest
  @ValueSource(booleans = {true, false})
  void createsCustomerOrEntityOwnedAccounts(boolean customerOwned) throws Exception {
    String owner =
        customerOwned
            ? "customer_af2937b0-9846-4fe7-bfe9-ccc22d935114"
            : "entity_af2937b0-9846-4fe7-bfe9-ccc22d935114";
    String name = "ABC XYZ Account";
    String idempotencyKey = "8e03978e-40d5-43e8-bc93-6894a57f9324";

    try (MockWebServer server = new MockWebServer()) {
      server.start();
      var response = ObjectMappers.JSON_MAPPER.createObjectNode();
      response.put("accountId", "account_af2937b0-9846-4fe7-bfe9-ccc22d935114");
      response.put("type", "cdp");
      response.put("owner", owner);
      response.put("name", name);
      response.put("createdAt", "2026-01-10T14:25:00Z");
      response.put("updatedAt", "2026-01-10T14:25:00Z");
      server.enqueue(new MockResponse().setResponseCode(201).setBody(response.toString()));

      CdpClient client =
          CdpClient.builder()
              .url(server.url("/").toString())
              .credentials("test-api-key-id", generateEcPrivateKey())
              .build();
      var accountRequest =
          CreateAccountRequest.builder().name(AccountName.of(name)).idempotencyKey(idempotencyKey);
      var expectedBody = ObjectMappers.JSON_MAPPER.createObjectNode().put("name", name);
      if (customerOwned) {
        accountRequest.owner(Owner.of(owner));
        expectedBody.put("owner", owner);
      }

      var account = client.accounts().createAccount(accountRequest.build());

      RecordedRequest request = server.takeRequest(1, TimeUnit.SECONDS);
      assertThat(request).isNotNull();
      assertThat(request.getMethod()).isEqualTo("POST");
      assertThat(request.getPath()).isEqualTo("/v2/accounts");
      assertThat(request.getHeader("X-Idempotency-Key")).isEqualTo(idempotencyKey);
      assertThat(ObjectMappers.JSON_MAPPER.readTree(request.getBody().readUtf8()))
          .isEqualTo(expectedBody);
      assertThat(account.getOwner()).isEqualTo(Owner.of(owner));
    }
  }

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
          .listAccounts(
              ListAccountsRequest.builder()
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
