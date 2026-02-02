package com.coinbase.cdp.examples.evm;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.client.evm.EvmClientOptions.ListSpendPermissionsOptions;
import com.coinbase.cdp.examples.utils.EnvLoader;
import com.coinbase.cdp.openapi.model.CreateEvmAccountRequest;
import com.coinbase.cdp.openapi.model.CreateEvmSmartAccountRequest;
import com.coinbase.cdp.openapi.model.CreateSpendPermissionRequest;
import com.coinbase.cdp.openapi.model.EvmUserOperation;
import com.coinbase.cdp.openapi.model.RevokeSpendPermissionRequest;
import com.coinbase.cdp.openapi.model.SpendPermissionNetwork;
import java.time.Instant;

/**
 * Example: Create, list, and revoke spend permissions for a smart account.
 *
 * <p>This example demonstrates the full lifecycle of spend permissions using the CDP SDK. Spend
 * permissions allow you to authorize a spender to spend tokens from your smart account up to a
 * specified allowance within a recurring time period.
 *
 * <p>The example will:
 *
 * <ol>
 *   <li>Create a server account to act as the smart account owner
 *   <li>Create a smart account owned by the server account
 *   <li>Create a spend permission for the smart account
 *   <li>List spend permissions to verify creation
 *   <li>Revoke the spend permission
 * </ol>
 *
 * <p>Usage: ./gradlew runSpendPermissions
 */
public class SpendPermissions {

  // Native ETH token address (ERC-7528)
  private static final String NATIVE_ETH = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    try (CdpClient cdp = CdpClient.create()) {
      // Step 1: Create a server account to be the owner of the smart account
      System.out.println("Step 1: Creating server account (owner)...");
      var serverAccount =
          cdp.evm()
              .createAccount(
                  new CreateEvmAccountRequest()
                      .name("spend-permissions-owner-" + System.currentTimeMillis()));
      System.out.println("  Server account address: " + serverAccount.getAddress());
      System.out.println();

      // Step 2: Create a smart account owned by the server account
      System.out.println("Step 2: Creating smart account...");
      var smartAccount =
          cdp.evm()
              .createSmartAccount(
                  new CreateEvmSmartAccountRequest()
                      .addOwnersItem(serverAccount.getAddress())
                      .name("spend-permissions-smart-" + System.currentTimeMillis()));
      System.out.println("  Smart account address: " + smartAccount.getAddress());
      System.out.println();

      // Step 3: Create a spend permission
      // This authorizes a spender to spend up to 0.001 ETH per day from the smart account
      System.out.println("Step 3: Creating spend permission...");

      long now = Instant.now().getEpochSecond();
      long oneDay = 86400; // seconds in a day
      long oneYear = oneDay * 365;

      var createRequest =
          CreateSpendPermissionRequest.builder()
              .network(SpendPermissionNetwork.BASE_SEPOLIA)
              .spender(serverAccount.getAddress()) // The server account can spend
              .token(NATIVE_ETH) // Native ETH
              .allowance("1000000000000000") // 0.001 ETH in wei
              .period(String.valueOf(oneDay)) // Allowance resets daily
              .start(String.valueOf(now)) // Start now
              .end(String.valueOf(now + oneYear)) // Valid for 1 year
              .build();

      EvmUserOperation createOp =
          cdp.evm().createSpendPermission(smartAccount.getAddress(), createRequest);

      System.out.println("  Spend permission created!");
      System.out.println("  User operation hash: " + createOp.getUserOpHash());
      System.out.println("  Status: " + createOp.getStatus());
      System.out.println();

      // Step 4: List spend permissions to verify creation
      System.out.println("Step 4: Listing spend permissions...");
      var listResponse =
          cdp.evm()
              .listSpendPermissions(
                  ListSpendPermissionsOptions.builder()
                      .address(smartAccount.getAddress())
                      .build());

      System.out.println("  Found " + listResponse.getSpendPermissions().size() + " permission(s)");
      for (var permission : listResponse.getSpendPermissions()) {
        System.out.println("  - Permission hash: " + permission.getPermissionHash());
        System.out.println("    Spender: " + permission.getPermission().getSpender());
        System.out.println("    Token: " + permission.getPermission().getToken());
        System.out.println("    Allowance: " + permission.getPermission().getAllowance() + " wei");
        System.out.println("    Revoked: " + permission.getRevoked());
      }
      System.out.println();

      // Step 5: Revoke the spend permission
      if (!listResponse.getSpendPermissions().isEmpty()) {
        System.out.println("Step 5: Revoking spend permission...");
        String permissionHash = listResponse.getSpendPermissions().get(0).getPermissionHash();

        var revokeRequest =
            RevokeSpendPermissionRequest.builder()
                .network(SpendPermissionNetwork.BASE_SEPOLIA)
                .permissionHash(permissionHash)
                .build();

        EvmUserOperation revokeOp =
            cdp.evm().revokeSpendPermission(smartAccount.getAddress(), revokeRequest);

        System.out.println("  Spend permission revoked!");
        System.out.println("  User operation hash: " + revokeOp.getUserOpHash());
        System.out.println("  Status: " + revokeOp.getStatus());
        System.out.println();

        // Verify the revocation
        System.out.println("Verifying revocation...");
        var verifyResponse =
            cdp.evm()
                .listSpendPermissions(
                    ListSpendPermissionsOptions.builder()
                        .address(smartAccount.getAddress())
                        .build());

        for (var permission : verifyResponse.getSpendPermissions()) {
          if (permission.getPermissionHash().equals(permissionHash)) {
            System.out.println("  Permission revoked: " + permission.getRevoked());
          }
        }
      }

      System.out.println();
      System.out.println("Spend permissions example completed successfully!");
    }
  }
}
