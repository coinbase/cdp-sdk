package com.coinbase.cdp.examples.enduser;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.examples.utils.EnvLoader;
import com.coinbase.cdp.openapi.model.AuthenticationMethod;
import com.coinbase.cdp.openapi.model.AuthenticationMethods;
import com.coinbase.cdp.openapi.model.CreateEndUserRequest;
import com.coinbase.cdp.openapi.model.EmailAuthentication;

/**
 * Example: Add an additional EVM account to an end user.
 *
 * <p>This example creates an end user and then adds a second EVM EOA account. End users can have
 * up to 10 EVM accounts.
 *
 * <p>Usage: ./gradlew runAddEndUserEvmAccount
 */
public class AddEndUserEvmAccount {

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

      // Step 1: Create an end user
      System.out.println("Step 1: Creating end user...");
      var endUser =
          cdp.endUser()
              .createEndUser(new CreateEndUserRequest().authenticationMethods(authMethods));

      System.out.println("  User ID: " + endUser.getUserId());
      System.out.println("  EVM accounts: " + endUser.getEvmAccountObjects().size());
      for (var account : endUser.getEvmAccountObjects()) {
        System.out.println("    Address: " + account.getAddress());
      }
      System.out.println();

      // Step 2: Add another EVM account
      System.out.println("Step 2: Adding another EVM account...");
      var newAccount = cdp.endUser().addEvmAccount(endUser.getUserId());

      System.out.println(
          "  New EVM account address: " + newAccount.getEvmAccount().getAddress());
      System.out.println();

      // Step 3: Verify by retrieving the end user
      System.out.println("Step 3: Verifying...");
      var updatedUser = cdp.endUser().getEndUser(endUser.getUserId());
      System.out.println(
          "  Total EVM accounts: " + updatedUser.getEvmAccountObjects().size());
      for (var account : updatedUser.getEvmAccountObjects()) {
        System.out.println("    Address: " + account.getAddress());
      }
    }
  }
}
