package com.coinbase.cdp.e2e;

import static org.assertj.core.api.Assertions.*;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.client.evm.EvmClientOptions.ListSmartAccountsOptions;
import com.coinbase.cdp.openapi.model.CreateEvmSmartAccountRequest;
import com.coinbase.cdp.openapi.model.EvmAccount;
import com.coinbase.cdp.openapi.model.EvmSmartAccount;
import java.util.List;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;

/** E2E tests for EVM smart account operations. */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class SmartAccountE2ETest {

  private static CdpClient cdp;
  private static String testSmartAccountAddress;

  @BeforeAll
  static void setup() throws Exception {
    cdp = TestUtils.createDefaultClient();
  }

  @AfterAll
  static void teardown() {
    if (cdp != null) {
      cdp.close();
    }
  }

  // ==================== Smart Account Lifecycle ====================

  @Test
  @Order(1)
  void shouldCreateSmartAccount() throws Exception {
    // Create a fresh owner account for this smart account
    EvmAccount ownerAccount = cdp.evm().createAccount();

    EvmSmartAccount smartAccount =
        cdp.evm()
            .createSmartAccount(
                new CreateEvmSmartAccountRequest().owners(List.of(ownerAccount.getAddress())));

    assertThat(smartAccount).isNotNull();
    assertThat(smartAccount.getAddress()).isNotBlank();
    assertThat(smartAccount.getAddress()).startsWith("0x");
    assertThat(smartAccount.getOwners()).isNotEmpty();
    assertThat(smartAccount.getOwners()).contains(ownerAccount.getAddress());

    testSmartAccountAddress = smartAccount.getAddress();
  }

  @Test
  @Order(2)
  void shouldCreateSmartAccountWithName() throws Exception {
    // Create a fresh owner account for this smart account
    EvmAccount ownerAccount = cdp.evm().createAccount();
    String name = TestUtils.generateRandomName();

    EvmSmartAccount smartAccount =
        cdp.evm()
            .createSmartAccount(
                new CreateEvmSmartAccountRequest()
                    .owners(List.of(ownerAccount.getAddress()))
                    .name(name));

    assertThat(smartAccount).isNotNull();
    assertThat(smartAccount.getAddress()).isNotBlank();
    assertThat(smartAccount.getName()).isEqualTo(name);
  }

  @Test
  @Order(3)
  void shouldListSmartAccounts() throws Exception {
    // Use a larger page size to increase the chance of finding the smart account
    var response =
        cdp.evm().listSmartAccounts(ListSmartAccountsOptions.builder().pageSize(100).build());

    assertThat(response).isNotNull();
    assertThat(response.getAccounts()).isNotEmpty();

    // Search through pages to find our created smart account
    boolean found =
        response.getAccounts().stream()
            .anyMatch(sa -> sa.getAddress().equals(testSmartAccountAddress));

    // If not found in first page, paginate through remaining pages
    String nextToken = response.getNextPageToken();
    while (!found && nextToken != null && !nextToken.isEmpty()) {
      var nextPage =
          cdp.evm()
              .listSmartAccounts(
                  ListSmartAccountsOptions.builder().pageSize(100).pageToken(nextToken).build());
      found =
          nextPage.getAccounts().stream()
              .anyMatch(sa -> sa.getAddress().equals(testSmartAccountAddress));
      nextToken = nextPage.getNextPageToken();
    }

    assertThat(found)
        .as("Expected to find smart account %s in list", testSmartAccountAddress)
        .isTrue();
  }

  @Test
  @Order(4)
  void shouldListSmartAccountsWithPagination() throws Exception {
    // First page
    var firstPage =
        cdp.evm().listSmartAccounts(ListSmartAccountsOptions.builder().pageSize(2).build());

    assertThat(firstPage).isNotNull();
    assertThat(firstPage.getAccounts()).isNotNull();

    // If there are more pages, fetch the next one
    if (firstPage.getNextPageToken() != null && !firstPage.getNextPageToken().isEmpty()) {
      var secondPage =
          cdp.evm()
              .listSmartAccounts(
                  ListSmartAccountsOptions.builder()
                      .pageSize(2)
                      .pageToken(firstPage.getNextPageToken())
                      .build());

      assertThat(secondPage).isNotNull();
      assertThat(secondPage.getAccounts()).isNotNull();
    }
  }

  // ==================== Multiple Owners ====================

  @Test
  @Order(10)
  void shouldCreateSmartAccountWithMultipleOwners() throws Exception {
    // Create a fresh owner for this smart account
    EvmAccount ownerAccount = cdp.evm().createAccount();

    // Create smart account with single owner (additional owners added via spend permissions)
    EvmSmartAccount smartAccount =
        cdp.evm()
            .createSmartAccount(
                new CreateEvmSmartAccountRequest().owners(List.of(ownerAccount.getAddress())));

    assertThat(smartAccount).isNotNull();
    assertThat(smartAccount.getOwners()).contains(ownerAccount.getAddress());
  }
}
