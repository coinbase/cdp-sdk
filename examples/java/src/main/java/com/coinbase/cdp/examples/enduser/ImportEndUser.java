package com.coinbase.cdp.examples.enduser;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.client.enduser.EndUserClientOptions.ImportEndUserOptions;
import com.coinbase.cdp.examples.utils.EnvLoader;
import com.coinbase.cdp.openapi.model.AuthenticationMethod;
import com.coinbase.cdp.openapi.model.AuthenticationMethods;
import com.coinbase.cdp.openapi.model.EmailAuthentication;
import com.coinbase.cdp.openapi.model.RequestEvmFaucetRequest;

/**
 * Example: Import an end user with a private key and request faucet funds.
 *
 * <p>This example demonstrates how to import an existing EVM private key as an end user. After
 * import, it requests testnet ETH from the faucet for the imported account.
 *
 * <p>Note: The private key is encrypted client-side before being sent to the API.
 *
 * <p>Usage: ./gradlew runImportEndUser
 */
public class ImportEndUser {

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    try (CdpClient cdp = CdpClient.create()) {
      // Build authentication methods with email
      var authMethods = new AuthenticationMethods();
      authMethods.add(
          new AuthenticationMethod(
              new EmailAuthentication()
                  .type(EmailAuthentication.TypeEnum.EMAIL)
                  .email("imported-user@example.com")));

      // Import an end user with an EVM private key
      System.out.println("Importing end user with EVM private key...");
      var importedUser =
          cdp.endUser()
              .importEndUser(
                  ImportEndUserOptions.builder()
                      .privateKey(
                          "0x0000000000000000000000000000000000000000000000000000000000000001")
                      .keyType("evm")
                      .authenticationMethods(authMethods)
                      .build());

      System.out.println("Imported end user:");
      System.out.println("  User ID: " + importedUser.getUserId());
      for (var account : importedUser.getEvmAccountObjects()) {
        System.out.println("  EVM Address: " + account.getAddress());

        // Request testnet ETH for the imported account
        System.out.println("\nRequesting testnet ETH from faucet...");
        var faucetResponse =
            cdp.evm()
                .requestFaucet(
                    new RequestEvmFaucetRequest()
                        .address(account.getAddress())
                        .network(RequestEvmFaucetRequest.NetworkEnum.BASE_SEPOLIA)
                        .token(RequestEvmFaucetRequest.TokenEnum.ETH));

        System.out.println("Faucet request successful!");
        System.out.println("Transaction hash: " + faucetResponse.getTransactionHash());
      }
    }
  }
}
