package com.coinbase.cdp.examples;

import com.coinbase.cdp.resources.evmaccounts.requests.CreateEvmAccountRequest;

/** Creates an EVM account with the generated Java client. */
public final class CreateEvmAccount {
  private CreateEvmAccount() {}

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    String accountName = "java-evm-" + System.currentTimeMillis();
    var account =
        CdpClientFactory.create()
            .evmAccounts()
            .createEvmAccount(CreateEvmAccountRequest.builder().name(accountName).build());

    System.out.println("Created EVM account:");
    System.out.println("  Address: " + account.getAddress());
    System.out.println("  Name: " + account.getName().orElse("(none)"));
  }
}
