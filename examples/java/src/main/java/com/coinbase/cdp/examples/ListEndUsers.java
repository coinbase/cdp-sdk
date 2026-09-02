package com.coinbase.cdp.examples;


/** Lists embedded-wallet end users with the generated Java client. */
public final class ListEndUsers {
  private ListEndUsers() {}

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    var endUsers = CdpClientFactory.create().endUserAccountManagement().listEndUsers();
    System.out.println("End users: " + endUsers);
  }
}
