package com.coinbase.cdp.examples.evm;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.examples.utils.EnvLoader;
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
 * <p>Alternative initialization using the builder pattern:
 *
 * <pre>{@code
 * CdpClient cdp = CdpClient.builder()
 *     .credentials("api-key-id", "api-key-secret")
 *     .walletSecret("wallet-secret")
 *     .build();
 * }</pre>
 *
 * <p>Usage: ./gradlew runRequestFaucet
 */
public class RequestFaucet {

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    try (CdpClient cdp = CdpClient.create()) {
      // First, create an account to receive funds using the high-level API
      System.out.println("Creating account...");
      var account =
          cdp.evm()
              .createAccount(
                  new CreateEvmAccountRequest()
                      .name("faucet-example-" + System.currentTimeMillis()));
      System.out.println("Account address: " + account.getAddress());
      System.out.println();

      // Request testnet ETH using the high-level API
      System.out.println("Requesting testnet ETH from faucet...");
      var faucetResponse =
          cdp.evm()
              .requestFaucet(
                  new RequestEvmFaucetRequest()
                      .address(account.getAddress())
                      .network(NetworkEnum.BASE_SEPOLIA)
                      .token(TokenEnum.ETH));

      System.out.println("Faucet request successful!");
      System.out.println("Transaction hash: " + faucetResponse.getTransactionHash());
      System.out.println(
          "View on explorer: https://sepolia.basescan.org/tx/"
              + faucetResponse.getTransactionHash());
    }
  }
}
