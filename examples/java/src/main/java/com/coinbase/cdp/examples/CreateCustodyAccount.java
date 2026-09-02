package com.coinbase.cdp.examples;

import com.coinbase.cdp.resources.accounts.requests.CreateAccountRequest;
import com.coinbase.cdp.types.AccountName;
import java.util.UUID;

/** Creates a flexible custody account owned by the authenticated entity. */
public final class CreateCustodyAccount {
  private CreateCustodyAccount() {}

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    String accountName =
        EnvLoader.orDefault("CDP_CUSTODY_ACCOUNT_NAME", "java-custody-" + System.currentTimeMillis());
    var account =
        CdpClientFactory.create()
            .accounts()
            .createFoundationAccount(
                CreateAccountRequest.builder()
                    .name(AccountName.of(accountName))
                    .idempotencyKey(UUID.randomUUID().toString())
                    .build());

    System.out.println("Created flexible custody account: " + account);
  }
}
