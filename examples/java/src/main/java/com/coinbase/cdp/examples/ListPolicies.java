package com.coinbase.cdp.examples;


/** Lists project policies with the generated Java client. */
public final class ListPolicies {
  private ListPolicies() {}

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    var policies = CdpClientFactory.create().policyEngine().listPolicies();
    System.out.println("Policies: " + policies);
  }
}
