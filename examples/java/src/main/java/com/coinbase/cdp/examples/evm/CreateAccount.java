package com.coinbase.cdp.examples.evm;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.evm.options.CreateAccountOptions;
import com.coinbase.cdp.examples.utils.EnvLoader;

/**
 * Example: Create an EVM account.
 *
 * <p>This example demonstrates how to create a new EVM account using the CDP SDK.
 *
 * <p>Usage: ./gradlew runCreateEvmAccount
 */
public class CreateAccount {

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    try (CdpClient cdp = CdpClient.create()) {
      // Create an account with a unique name
      String accountName = "java-example-" + System.currentTimeMillis();

      var account =
          cdp.evm().createAccount(CreateAccountOptions.builder().name(accountName).build());

      System.out.println("Created EVM account:");
      System.out.println("  Address: " + account.getAddress());
      System.out.println("  Name: " + account.getName());
    }
  }
}
