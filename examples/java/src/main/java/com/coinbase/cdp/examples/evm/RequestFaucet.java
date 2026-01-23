package com.coinbase.cdp.examples.evm;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.examples.utils.EnvLoader;
import com.coinbase.cdp.openapi.api.EvmAccountsApi;
import com.coinbase.cdp.openapi.api.FaucetsApi;
import com.coinbase.cdp.openapi.model.CreateEvmAccountRequest;
import com.coinbase.cdp.openapi.model.RequestEvmFaucetRequest;
import com.coinbase.cdp.openapi.model.RequestEvmFaucetRequest.NetworkEnum;
import com.coinbase.cdp.openapi.model.RequestEvmFaucetRequest.TokenEnum;

/**
 * Example: Request testnet ETH from the faucet.
 *
 * <p>This example demonstrates how to request testnet ETH from the CDP faucet. The faucet provides
 * test tokens for development on testnets like Base Sepolia.
 *
 * <p>Usage: ./gradlew runRequestFaucet
 */
public class RequestFaucet {

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    try (CdpClient cdp = CdpClient.create()) {
      EvmAccountsApi evmApi = new EvmAccountsApi(cdp.getApiClient());
      FaucetsApi faucetsApi = new FaucetsApi(cdp.getApiClient());

      // First, create an account to receive funds
      System.out.println("Creating account...");
      var createRequest =
          new CreateEvmAccountRequest().name("faucet-example-" + System.currentTimeMillis());
      String createJwt = cdp.generateWalletJwt("POST", "/v2/evm/accounts", createRequest);
      var account = evmApi.createEvmAccount(createJwt, null, createRequest);
      System.out.println("Account address: " + account.getAddress());
      System.out.println();

      // Request testnet ETH
      System.out.println("Requesting testnet ETH from faucet...");
      var faucetRequest =
          new RequestEvmFaucetRequest()
              .address(account.getAddress())
              .network(NetworkEnum.BASE_SEPOLIA)
              .token(TokenEnum.ETH);

      var faucetResponse = faucetsApi.requestEvmFaucet(faucetRequest);

      System.out.println("Faucet request successful!");
      System.out.println("Transaction hash: " + faucetResponse.getTransactionHash());
      System.out.println(
          "View on explorer: https://sepolia.basescan.org/tx/"
              + faucetResponse.getTransactionHash());
    }
  }
}
