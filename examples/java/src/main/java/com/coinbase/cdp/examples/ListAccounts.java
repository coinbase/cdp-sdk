package com.coinbase.cdp.examples;


/** Lists flexible custody accounts with the generated Java SDK. */
public final class ListAccounts {
  private ListAccounts() {}

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    var accounts = CdpClientFactory.create().accounts().listFoundationAccounts();
    System.out.println("Flexible custody accounts: " + accounts);
  }
}
