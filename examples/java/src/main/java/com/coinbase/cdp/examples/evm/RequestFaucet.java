package com.coinbase.cdp.examples.evm;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.evm.options.CreateAccountOptions;
import com.coinbase.cdp.evm.options.RequestFaucetOptions;
import com.coinbase.cdp.examples.utils.EnvLoader;

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
      // First, create an account to receive funds
      System.out.println("Creating account...");
      var account =
          cdp.evm()
              .createAccount(
                  CreateAccountOptions.builder()
                      .name("faucet-example-" + System.currentTimeMillis())
                      .build());
      System.out.println("Account address: " + account.getAddress());
      System.out.println();

      // Request testnet ETH
      System.out.println("Requesting testnet ETH from faucet...");
      var faucetResponse =
          cdp.evm()
              .requestFaucet(
                  RequestFaucetOptions.builder()
                      .address(account.getAddress())
                      .network("base-sepolia")
                      .token("eth")
                      .build());

      System.out.println("Faucet request successful!");
      System.out.println("Transaction hash: " + faucetResponse.getTransactionHash());
      System.out.println(
          "View on explorer: https://sepolia.basescan.org/tx/"
              + faucetResponse.getTransactionHash());
    }
  }
}
