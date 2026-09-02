package com.coinbase.cdp.examples;


/** Lists flexible custody transfers with the generated Java SDK. */
public final class ListTransfers {
  private ListTransfers() {}

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    var transfers = CdpClientFactory.create().transfers().listTransfers();
    System.out.println("Transfers: " + transfers);
  }
}
