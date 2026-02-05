package com.coinbase.cdp.examples.evm;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.examples.utils.EnvLoader;
import com.coinbase.cdp.openapi.model.CreateEvmAccountRequest;

/**
 * Example: Create an EVM account.
 *
 * <p>This example demonstrates how to create a new EVM account using the CDP SDK's high-level API.
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
 * <p>Usage: ./gradlew runCreateEvmAccount
 */
public class CreateAccount {

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    // Create an account with a unique name using the high-level API
    String accountName = "java-example-" + System.currentTimeMillis();

    try (CdpClient cdp = CdpClient.create()) {
      // Use the generated OpenAPI request type directly
      var account =
          cdp.evm().createAccount(new CreateEvmAccountRequest().name(accountName));

      System.out.println("Created EVM account:");
      System.out.println("  Address: " + account.getAddress());
      System.out.println("  Name: " + account.getName());
    }
  }
}
