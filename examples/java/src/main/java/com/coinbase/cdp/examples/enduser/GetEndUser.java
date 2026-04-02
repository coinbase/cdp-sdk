package com.coinbase.cdp.examples.enduser;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.examples.utils.EnvLoader;

/**
 * Example: Get an end user by userId.
 *
 * <p>This example demonstrates how to retrieve a specific end user by their unique identifier.
 *
 * <p>Usage: ./gradlew runGetEndUser --args="&lt;userId&gt;"
 */
public class GetEndUser {

  public static void main(String[] args) throws Exception {
    if (args.length < 1) {
      System.err.println("Usage: GetEndUser <userId>");
      System.exit(1);
    }

    String userId = args[0];
    EnvLoader.load();

    try (CdpClient cdp = CdpClient.create()) {
      System.out.println("Looking up end user: " + userId);
      System.out.println();

      var endUser = cdp.endUser().getEndUser(userId);

      System.out.println("End user details:");
      System.out.println("  User ID: " + endUser.getUserId());
      System.out.println("  Created at: " + endUser.getCreatedAt());

      System.out.println("  EVM accounts (" + endUser.getEvmAccountObjects().size() + "):");
      for (var account : endUser.getEvmAccountObjects()) {
        System.out.println("    Address: " + account.getAddress());
        System.out.println("    Created at: " + account.getCreatedAt());
      }

      System.out.println(
          "  EVM smart accounts (" + endUser.getEvmSmartAccountObjects().size() + "):");
      for (var smartAccount : endUser.getEvmSmartAccountObjects()) {
        System.out.println("    Address: " + smartAccount.getAddress());
        System.out.println("    Owners: " + smartAccount.getOwnerAddresses());
        System.out.println("    Created at: " + smartAccount.getCreatedAt());
      }

      System.out.println(
          "  Solana accounts (" + endUser.getSolanaAccountObjects().size() + "):");
      for (var solAccount : endUser.getSolanaAccountObjects()) {
        System.out.println("    Address: " + solAccount.getAddress());
      }
    }
  }
}
