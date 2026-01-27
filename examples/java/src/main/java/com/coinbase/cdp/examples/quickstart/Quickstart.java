package com.coinbase.cdp.examples.quickstart;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.evm.options.CreateAccountOptions;
import com.coinbase.cdp.evm.options.RequestFaucetOptions;
import com.coinbase.cdp.examples.utils.EnvLoader;

/**
 * Quickstart example demonstrating basic CDP SDK usage.
 *
 * <p>This example shows how to:
 *
 * <ol>
 *   <li>Initialize the CDP client
 *   <li>Create an EVM account
 *   <li>Request testnet ETH from the faucet
 * </ol>
 *
 * <p>Usage: ./gradlew runQuickstart
 */
public class Quickstart {

  public static void main(String[] args) throws Exception {
    // Load environment variables from .env file
    EnvLoader.load();

    System.out.println("CDP Java SDK Quickstart\n");
    System.out.println("=".repeat(50));

    try (CdpClient cdp = CdpClient.create()) {
      // Step 1: Create an EVM account
      System.out.println("\n1. Creating EVM account...");
      var account =
          cdp.evm()
              .createAccount(
                  CreateAccountOptions.builder()
                      .name("quickstart-" + System.currentTimeMillis())
                      .build());

      System.out.println("   Account created!");
      System.out.println("   Address: " + account.getAddress());
      System.out.println("   Name: " + account.getName());

      // Step 2: Request testnet ETH from faucet
      System.out.println("\n2. Requesting testnet ETH from faucet...");
      var faucetResponse =
          cdp.evm()
              .requestFaucet(
                  RequestFaucetOptions.builder()
                      .address(account.getAddress())
                      .network("base-sepolia")
                      .token("eth")
                      .build());

      System.out.println("   Faucet request successful!");
      System.out.println("   Transaction hash: " + faucetResponse.getTransactionHash());
      System.out.println(
          "   View on explorer: https://sepolia.basescan.org/tx/"
              + faucetResponse.getTransactionHash());

      // Step 3: List all accounts
      System.out.println("\n3. Listing all EVM accounts...");
      var accountsList = cdp.evm().listAccounts();
      System.out.println("   Total accounts: " + accountsList.getAccounts().size());

      System.out.println("\n" + "=".repeat(50));
      System.out.println("Quickstart complete!");
    }
  }
}
