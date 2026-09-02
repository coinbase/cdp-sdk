package com.coinbase.cdp.examples;

import com.coinbase.cdp.errors.NotFoundError;

/** Retrieves an API-key-authorized delegation for an end user. */
public final class GetEndUserDelegation {
  private GetEndUserDelegation() {}

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    try {
      var delegation =
          CdpClientFactory.create()
              .endUserAccounts()
              .getDelegationForEndUser(EnvLoader.required("CDP_END_USER_ID"));
      System.out.println("End user delegation: " + delegation);
    } catch (NotFoundError exception) {
      System.out.println("No active delegation exists for this end user.");
    }
  }
}
