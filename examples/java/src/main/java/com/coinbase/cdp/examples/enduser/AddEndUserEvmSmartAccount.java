package com.coinbase.cdp.examples.enduser;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.examples.utils.EnvLoader;
import com.coinbase.cdp.openapi.model.AddEndUserEvmSmartAccountRequest;
import com.coinbase.cdp.openapi.model.AuthenticationMethod;
import com.coinbase.cdp.openapi.model.AuthenticationMethods;
import com.coinbase.cdp.openapi.model.CreateEndUserRequest;
import com.coinbase.cdp.openapi.model.CreateEndUserRequestEvmAccount;
import com.coinbase.cdp.openapi.model.EmailAuthentication;

/**
 * Example: Add an additional EVM smart account to an end user.
 *
 * <p>This example creates an end user with a smart account, then adds another smart account.
 *
 * <p>Usage: ./gradlew runAddEndUserEvmSmartAccount
 */
public class AddEndUserEvmSmartAccount {

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    try (CdpClient cdp = CdpClient.create()) {
      // Build authentication methods with email
      var authMethods = new AuthenticationMethods();
      authMethods.add(
          new AuthenticationMethod(
              new EmailAuthentication()
                  .type(EmailAuthentication.TypeEnum.EMAIL)
                  .email("user@example.com")));

      // Step 1: Create an end user with a smart account
      System.out.println("Step 1: Creating end user with smart account...");
      var endUser =
          cdp.endUser()
              .createEndUser(
                  new CreateEndUserRequest()
                      .authenticationMethods(authMethods)
                      .evmAccount(
                          new CreateEndUserRequestEvmAccount().createSmartAccount(true)));

      System.out.println("  User ID: " + endUser.getUserId());
      System.out.println(
          "  EVM smart accounts: " + endUser.getEvmSmartAccountObjects().size());
      for (var smartAccount : endUser.getEvmSmartAccountObjects()) {
        System.out.println("    Address: " + smartAccount.getAddress());
        System.out.println("    Owners: " + smartAccount.getOwnerAddresses());
      }
      System.out.println();

      // Step 2: Add another smart account
      System.out.println("Step 2: Adding another smart account...");
      var newSmartAccount =
          cdp.endUser()
              .addEvmSmartAccount(
                  endUser.getUserId(), new AddEndUserEvmSmartAccountRequest());

      System.out.println(
          "  New smart account address: "
              + newSmartAccount.getEvmSmartAccount().getAddress());
      System.out.println();

      // Step 3: Verify by retrieving the end user
      System.out.println("Step 3: Verifying...");
      var updatedUser = cdp.endUser().getEndUser(endUser.getUserId());
      System.out.println(
          "  Total EVM smart accounts: "
              + updatedUser.getEvmSmartAccountObjects().size());
      for (var smartAccount : updatedUser.getEvmSmartAccountObjects()) {
        System.out.println("    Address: " + smartAccount.getAddress());
        System.out.println("    Owners: " + smartAccount.getOwnerAddresses());
      }
    }
  }
}
