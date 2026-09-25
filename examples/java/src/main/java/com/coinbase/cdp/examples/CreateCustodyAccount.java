package com.coinbase.cdp.examples;

import com.coinbase.cdp.resources.accounts.requests.CreateAccountRequest;
import com.coinbase.cdp.types.AccountName;
import com.coinbase.cdp.types.Owner;
import java.util.UUID;

/** Creates a flexible custody account owned by the entity or CDP_CUSTODY_ACCOUNT_OWNER customer. */
public final class CreateCustodyAccount {
  private CreateCustodyAccount() {}

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    String accountName =
        EnvLoader.orDefault("CDP_CUSTODY_ACCOUNT_NAME", "java-custody-" + System.currentTimeMillis());
    var request =
        CreateAccountRequest.builder()
            .name(AccountName.of(accountName))
            .idempotencyKey(UUID.randomUUID().toString());
    String owner = EnvLoader.orDefault("CDP_CUSTODY_ACCOUNT_OWNER", "");
    if (!owner.isBlank()) {
      // The customer must have custodyCrypto, custodyFiat, and custodyStablecoin enabled.
      request.owner(Owner.of(owner));
    }
    var account = CdpClientFactory.create().accounts().createAccount(request.build());

    System.out.println("Created flexible custody account: " + account);
  }
}
