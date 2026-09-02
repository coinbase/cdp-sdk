package com.coinbase.cdp.examples;


/** Lists EVM accounts with the generated Java client. */
public final class ListEvmAccounts {
  private ListEvmAccounts() {}

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    var accounts = CdpClientFactory.create().evmAccounts().listEvmAccounts();
    System.out.println("EVM accounts (" + accounts.getAccounts().size() + " total):");
    for (var account : accounts.getAccounts()) {
      System.out.println("  Address: " + account.getAddress());
      System.out.println("  Name: " + account.getName().orElse("(none)"));
    }
  }
}
