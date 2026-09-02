package com.coinbase.cdp.examples;


/** Lists EVM smart accounts with the generated Java client. */
public final class ListEvmSmartAccounts {
  private ListEvmSmartAccounts() {}

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    var accounts = CdpClientFactory.create().evmSmartAccounts().listEvmSmartAccounts();
    System.out.println("EVM smart accounts: " + accounts);
  }
}
