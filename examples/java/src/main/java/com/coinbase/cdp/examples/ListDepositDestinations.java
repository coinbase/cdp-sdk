package com.coinbase.cdp.examples;


/** Lists flexible custody deposit destinations with the generated Java SDK. */
public final class ListDepositDestinations {
  private ListDepositDestinations() {}

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    var depositDestinations =
        CdpClientFactory.create().depositDestinations().listDepositDestinations();
    System.out.println("Deposit destinations: " + depositDestinations);
  }
}
