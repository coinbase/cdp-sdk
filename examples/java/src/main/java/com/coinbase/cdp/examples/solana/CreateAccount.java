package com.coinbase.cdp.examples.solana;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.examples.utils.EnvLoader;
import com.coinbase.cdp.openapi.api.SolanaAccountsApi;
import com.coinbase.cdp.openapi.model.CreateSolanaAccountRequest;

/**
 * Example: Create a Solana account.
 *
 * <p>This example demonstrates how to create a new Solana account using the CDP SDK.
 *
 * <p>Usage: ./gradlew runCreateSolanaAccount
 */
public class CreateAccount {

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    try (CdpClient cdp = CdpClient.create()) {
      SolanaAccountsApi solanaApi = new SolanaAccountsApi(cdp.getApiClient());

      // Create an account with a unique name
      String accountName = "java-solana-" + System.currentTimeMillis();
      var request = new CreateSolanaAccountRequest().name(accountName);

      // Generate wallet JWT for the write operation
      String walletJwt = cdp.generateWalletJwt("POST", "/v2/solana/accounts", request);

      // Create the account
      var account = solanaApi.createSolanaAccount(walletJwt, null, request);

      System.out.println("Created Solana account:");
      System.out.println("  Address: " + account.getAddress());
      System.out.println("  Name: " + account.getName());
    }
  }
}
