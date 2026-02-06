package com.coinbase.cdp.examples.solana;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.examples.utils.EnvLoader;
import com.coinbase.cdp.openapi.model.CreateSolanaAccountRequest;

/**
 * Example: Create a Solana account.
 *
 * <p>This example demonstrates how to create a new Solana account using the CDP SDK's high-level
 * API.
 *
 * <p>Alternative initialization using the builder pattern:
 *
 * <pre>{@code
 * CdpClient cdp = CdpClient.builder()
 *     .credentials("api-key-id", "api-key-secret")
 *     .walletSecret("wallet-secret")
 *     .build();
 * }</pre>
 *
 * <p>Usage: ./gradlew runCreateSolanaAccount
 */
public class CreateAccount {

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    try (CdpClient cdp = CdpClient.create()) {
      // Create an account with a unique name using the high-level API
      String accountName = "java-solana-" + System.currentTimeMillis();

      var account =
          cdp.solana().createAccount(new CreateSolanaAccountRequest().name(accountName));

      System.out.println("Created Solana account:");
      System.out.println("  Address: " + account.getAddress());
      System.out.println("  Name: " + account.getName());
    }
  }
}
