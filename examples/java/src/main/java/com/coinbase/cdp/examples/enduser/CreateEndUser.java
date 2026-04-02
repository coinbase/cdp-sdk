package com.coinbase.cdp.examples.enduser;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.examples.utils.EnvLoader;
import com.coinbase.cdp.openapi.model.AuthenticationMethod;
import com.coinbase.cdp.openapi.model.AuthenticationMethods;
import com.coinbase.cdp.openapi.model.CreateEndUserRequest;
import com.coinbase.cdp.openapi.model.CreateEndUserRequestEvmAccount;
import com.coinbase.cdp.openapi.model.EmailAuthentication;

/**
 * Example: Create end users with email authentication.
 *
 * <p>This example demonstrates three ways to create end users:
 *
 * <ol>
 *   <li>Basic end user with an EVM EOA account
 *   <li>End user with a smart account
 *   <li>End user with a smart account and spend permissions enabled
 * </ol>
 *
 * <p>Usage: ./gradlew runCreateEndUser
 */
public class CreateEndUser {

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

      // 1. Create a basic end user with an EVM EOA account
      System.out.println("1. Creating basic end user...");
      var basicUser =
          cdp.endUser()
              .createEndUser(
                  new CreateEndUserRequest().authenticationMethods(authMethods));

      System.out.println("  User ID: " + basicUser.getUserId());
      System.out.println("  EVM accounts: " + basicUser.getEvmAccountObjects().size());
      for (var account : basicUser.getEvmAccountObjects()) {
        System.out.println("    Address: " + account.getAddress());
      }
      System.out.println();

      // 2. Create an end user with a smart account
      System.out.println("2. Creating end user with smart account...");
      var smartUser =
          cdp.endUser()
              .createEndUser(
                  new CreateEndUserRequest()
                      .authenticationMethods(authMethods)
                      .evmAccount(
                          new CreateEndUserRequestEvmAccount().createSmartAccount(true)));

      System.out.println("  User ID: " + smartUser.getUserId());
      System.out.println("  EVM accounts: " + smartUser.getEvmAccountObjects().size());
      for (var account : smartUser.getEvmAccountObjects()) {
        System.out.println("    EOA Address: " + account.getAddress());
      }
      System.out.println(
          "  EVM smart accounts: " + smartUser.getEvmSmartAccountObjects().size());
      for (var smartAccount : smartUser.getEvmSmartAccountObjects()) {
        System.out.println("    Smart Account Address: " + smartAccount.getAddress());
        System.out.println("    Owners: " + smartAccount.getOwnerAddresses());
      }
      System.out.println();

      // 3. Create an end user with a smart account and spend permissions
      System.out.println("3. Creating end user with smart account + spend permissions...");
      var spendUser =
          cdp.endUser()
              .createEndUser(
                  new CreateEndUserRequest()
                      .authenticationMethods(authMethods)
                      .evmAccount(
                          new CreateEndUserRequestEvmAccount()
                              .createSmartAccount(true)
                              .enableSpendPermissions(true)));

      System.out.println("  User ID: " + spendUser.getUserId());
      System.out.println("  EVM accounts: " + spendUser.getEvmAccountObjects().size());
      System.out.println(
          "  EVM smart accounts: " + spendUser.getEvmSmartAccountObjects().size());
      for (var smartAccount : spendUser.getEvmSmartAccountObjects()) {
        System.out.println("    Smart Account Address: " + smartAccount.getAddress());
      }

      System.out.println();
      System.out.println("All end users created successfully!");
    }
  }
}
