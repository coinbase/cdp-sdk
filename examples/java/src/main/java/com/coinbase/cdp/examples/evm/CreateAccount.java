package com.coinbase.cdp.examples.evm;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.examples.utils.EnvLoader;
import com.coinbase.cdp.openapi.api.EvmAccountsApi;
import com.coinbase.cdp.openapi.model.CreateEvmAccountRequest;

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
      EvmAccountsApi evmApi = new EvmAccountsApi(cdp.getApiClient());

      // Create an account with a unique name
      String accountName = "java-example-" + System.currentTimeMillis();
      var request = new CreateEvmAccountRequest().name(accountName);

      // Generate wallet JWT for the write operation
      String walletJwt = cdp.generateWalletJwt("POST", "/v2/evm/accounts", request);

      // Create the account
      var account = evmApi.createEvmAccount(walletJwt, null, request);

      System.out.println("Created EVM account:");
      System.out.println("  Address: " + account.getAddress());
      System.out.println("  Name: " + account.getName());
    }
  }
}
