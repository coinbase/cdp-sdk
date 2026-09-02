package com.coinbase.cdp.examples;


/** Retrieves an EVM account by address with the generated Java client. */
public final class GetEvmAccount {
  private GetEvmAccount() {}

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    String address = EnvLoader.required("CDP_EVM_ACCOUNT_ADDRESS");
    var account = CdpClientFactory.create().evmAccounts().getEvmAccount(address);

    System.out.println("EVM account:");
    System.out.println("  Address: " + account.getAddress());
    System.out.println("  Name: " + account.getName().orElse("(none)"));
  }
}
