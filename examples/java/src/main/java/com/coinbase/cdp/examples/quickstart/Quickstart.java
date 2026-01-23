package com.coinbase.cdp.examples.quickstart;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.examples.utils.EnvLoader;
import com.coinbase.cdp.openapi.api.EvmAccountsApi;
import com.coinbase.cdp.openapi.api.FaucetsApi;
import com.coinbase.cdp.openapi.model.CreateEvmAccountRequest;
import com.coinbase.cdp.openapi.model.RequestEvmFaucetRequest;
import com.coinbase.cdp.openapi.model.RequestEvmFaucetRequest.NetworkEnum;
import com.coinbase.cdp.openapi.model.RequestEvmFaucetRequest.TokenEnum;

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
      // Get the configured API client
      var apiClient = cdp.getApiClient();

      // Create API instances
      EvmAccountsApi evmApi = new EvmAccountsApi(apiClient);
      FaucetsApi faucetsApi = new FaucetsApi(apiClient);

      // Step 1: Create an EVM account
      System.out.println("\n1. Creating EVM account...");
      var createRequest =
          new CreateEvmAccountRequest().name("quickstart-" + System.currentTimeMillis());
      String walletJwt = cdp.generateWalletJwt("POST", "/v2/evm/accounts", createRequest);
      var account = evmApi.createEvmAccount(walletJwt, null, createRequest);

      System.out.println("   Account created!");
      System.out.println("   Address: " + account.getAddress());
      System.out.println("   Name: " + account.getName());

      // Step 2: Request testnet ETH from faucet
      System.out.println("\n2. Requesting testnet ETH from faucet...");
      var faucetRequest =
          new RequestEvmFaucetRequest()
              .address(account.getAddress())
              .network(NetworkEnum.BASE_SEPOLIA)
              .token(TokenEnum.ETH);
      var faucetResponse = faucetsApi.requestEvmFaucet(faucetRequest);

      System.out.println("   Faucet request successful!");
      System.out.println("   Transaction hash: " + faucetResponse.getTransactionHash());
      System.out.println(
          "   View on explorer: https://sepolia.basescan.org/tx/"
              + faucetResponse.getTransactionHash());

      // Step 3: List all accounts
      System.out.println("\n3. Listing all EVM accounts...");
      var accountsList = evmApi.listEvmAccounts(null, null);
      System.out.println("   Total accounts: " + accountsList.getAccounts().size());

      System.out.println("\n" + "=".repeat(50));
      System.out.println("Quickstart complete!");
    }
  }
}
