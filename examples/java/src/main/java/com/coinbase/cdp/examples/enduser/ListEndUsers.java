package com.coinbase.cdp.examples.enduser;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.client.enduser.EndUserClientOptions.ListEndUsersOptions;
import com.coinbase.cdp.examples.utils.EnvLoader;
import java.util.List;

/**
 * Example: List end users with pagination.
 *
 * <p>This example demonstrates how to list end users sorted by creation date in descending order,
 * with a page size of 10.
 *
 * <p>Usage: ./gradlew runListEndUsers
 */
public class ListEndUsers {

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    try (CdpClient cdp = CdpClient.create()) {
      System.out.println("Listing end users (page size: 10, sorted by createdAt desc)...");
      System.out.println();

      var response =
          cdp.endUser()
              .listEndUsers(
                  ListEndUsersOptions.builder()
                      .pageSize(10)
                      .sort(List.of("createdAt=desc"))
                      .build());

      var endUsers = response.getEndUsers();
      System.out.println("End Users (" + endUsers.size() + " returned):");
      System.out.println();

      for (var endUser : endUsers) {
        System.out.println("  User ID: " + endUser.getUserId());
        System.out.println("    EVM accounts: " + endUser.getEvmAccountObjects().size());
        System.out.println(
            "    EVM smart accounts: " + endUser.getEvmSmartAccountObjects().size());
        System.out.println(
            "    Solana accounts: " + endUser.getSolanaAccountObjects().size());
        System.out.println();
      }

      if (endUsers.isEmpty()) {
        System.out.println("  No end users found. Run CreateEndUser first.");
      }
    }
  }
}
