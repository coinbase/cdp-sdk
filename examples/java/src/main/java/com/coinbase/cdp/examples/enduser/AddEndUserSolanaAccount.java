package com.coinbase.cdp.examples.enduser;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.examples.utils.EnvLoader;
import com.coinbase.cdp.openapi.model.AuthenticationMethod;
import com.coinbase.cdp.openapi.model.AuthenticationMethods;
import com.coinbase.cdp.openapi.model.CreateEndUserRequest;
import com.coinbase.cdp.openapi.model.CreateEndUserRequestSolanaAccount;
import com.coinbase.cdp.openapi.model.EmailAuthentication;

/**
 * Example: Add an additional Solana account to an end user.
 *
 * <p>This example creates an end user with a Solana account, then adds another Solana account. End
 * users can have up to 10 Solana accounts.
 *
 * <p>Usage: ./gradlew runAddEndUserSolanaAccount
 */
public class AddEndUserSolanaAccount {

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

      // Step 1: Create an end user with a Solana account
      System.out.println("Step 1: Creating end user with Solana account...");
      var endUser =
          cdp.endUser()
              .createEndUser(
                  new CreateEndUserRequest()
                      .authenticationMethods(authMethods)
                      .solanaAccount(new CreateEndUserRequestSolanaAccount()));

      System.out.println("  User ID: " + endUser.getUserId());
      System.out.println(
          "  Solana accounts: " + endUser.getSolanaAccountObjects().size());
      for (var account : endUser.getSolanaAccountObjects()) {
        System.out.println("    Address: " + account.getAddress());
      }
      System.out.println();

      // Step 2: Add another Solana account
      System.out.println("Step 2: Adding another Solana account...");
      var newAccount = cdp.endUser().addSolanaAccount(endUser.getUserId());

      System.out.println(
          "  New Solana account address: " + newAccount.getSolanaAccount().getAddress());
      System.out.println();

      // Step 3: Verify by retrieving the end user
      System.out.println("Step 3: Verifying...");
      var updatedUser = cdp.endUser().getEndUser(endUser.getUserId());
      System.out.println(
          "  Total Solana accounts: " + updatedUser.getSolanaAccountObjects().size());
      for (var account : updatedUser.getSolanaAccountObjects()) {
        System.out.println("    Address: " + account.getAddress());
      }
    }
  }
}
