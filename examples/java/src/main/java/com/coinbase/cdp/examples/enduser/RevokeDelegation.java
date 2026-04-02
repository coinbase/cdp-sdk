package com.coinbase.cdp.examples.enduser;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.examples.utils.EnvLoader;

/**
 * Example: Revoke all active delegations for an end user.
 *
 * <p>This example demonstrates how to revoke all active delegations for a specified end user. After
 * revocation, the developer will no longer be able to perform delegated signing or sending
 * operations on behalf of the end user.
 *
 * <p>Usage: ./gradlew runRevokeDelegation --args="&lt;userId&gt;"
 */
public class RevokeDelegation {

  public static void main(String[] args) throws Exception {
    if (args.length < 1) {
      System.err.println("Usage: RevokeDelegation <userId>");
      System.exit(1);
    }

    String userId = args[0];
    EnvLoader.load();

    try (CdpClient cdp = CdpClient.create()) {
      System.out.println("Revoking all delegations for user: " + userId);

      cdp.endUser().revokeDelegation(userId);

      System.out.println("All delegations revoked successfully!");
    }
  }
}
