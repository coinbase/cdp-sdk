package com.coinbase.cdp.examples.evm;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.client.evm.EvmClientOptions.TransferOptions;
import com.coinbase.cdp.examples.utils.EnvLoader;
import com.coinbase.cdp.openapi.model.CreateEvmAccountRequest;
import com.coinbase.cdp.openapi.model.RequestEvmFaucetRequest;
import com.coinbase.cdp.openapi.model.SendEvmTransactionRequest.NetworkEnum;
import java.math.BigInteger;
import java.util.Optional;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.methods.response.TransactionReceipt;
import org.web3j.protocol.http.HttpService;

/**
 * Example: Transfer USDC between accounts.
 *
 * <p>This example demonstrates how to use the high-level transfer API to send USDC between two
 * accounts. It creates a sender and receiver account, funds the sender with ETH (for gas) and USDC
 * from the faucet, and then transfers USDC to the receiver.
 *
 * <p>Usage: ./gradlew runTransfer
 */
public class Transfer {

  private static final String BASE_SEPOLIA_RPC = "https://sepolia.base.org";

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    try (CdpClient cdp = CdpClient.create()) {
      // Create sender account
      System.out.println("Creating sender account...");
      var sender =
          cdp.evm()
              .createAccount(
                  new CreateEvmAccountRequest().name("transfer-sender-" + System.currentTimeMillis()));
      System.out.println("Sender address: " + sender.getAddress());

      // Create receiver account
      System.out.println("Creating receiver account...");
      var receiver =
          cdp.evm()
              .createAccount(
                  new CreateEvmAccountRequest()
                      .name("transfer-receiver-" + System.currentTimeMillis()));
      System.out.println("Receiver address: " + receiver.getAddress());

      // Fund sender with ETH (for gas) and USDC (to transfer)
      System.out.println("\nRequesting testnet ETH and USDC from faucet...");
      var ethFaucetResponse =
          cdp.evm()
              .requestFaucet(
                  new RequestEvmFaucetRequest()
                      .address(sender.getAddress())
                      .network(RequestEvmFaucetRequest.NetworkEnum.BASE_SEPOLIA)
                      .token(RequestEvmFaucetRequest.TokenEnum.ETH));
      System.out.println("ETH faucet transaction: " + ethFaucetResponse.getTransactionHash());

      var usdcFaucetResponse =
          cdp.evm()
              .requestFaucet(
                  new RequestEvmFaucetRequest()
                      .address(sender.getAddress())
                      .network(RequestEvmFaucetRequest.NetworkEnum.BASE_SEPOLIA)
                      .token(RequestEvmFaucetRequest.TokenEnum.USDC));
      System.out.println("USDC faucet transaction: " + usdcFaucetResponse.getTransactionHash());

      // Wait for both faucet transactions to be confirmed
      System.out.println("Waiting for faucet transactions to be confirmed...");
      waitForTransactionReceipt(ethFaucetResponse.getTransactionHash());
      waitForTransactionReceipt(usdcFaucetResponse.getTransactionHash());
      System.out.println("Faucet transactions confirmed!");

      // Small delay to ensure state is propagated
      Thread.sleep(2000);

      // Transfer USDC (0.01 USDC = 10000 because USDC has 6 decimals)
      System.out.println("\nTransferring 0.01 USDC to receiver...");
      var result =
          cdp.evm()
              .transfer(
                  sender.getAddress(),
                  TransferOptions.builder()
                      .to(receiver.getAddress())
                      .amount(new BigInteger("10000")) // 0.01 USDC (6 decimals)
                      .token("usdc")
                      .network(NetworkEnum.BASE_SEPOLIA)
                      .build());

      System.out.println("\nTransfer successful!");
      System.out.println("Transaction hash: " + result.getTransactionHash());
      System.out.println(
          "View on explorer: https://sepolia.basescan.org/tx/" + result.getTransactionHash());
    }
  }

  /**
   * Waits for a transaction to be confirmed on Base Sepolia.
   *
   * <p>Polls the Base Sepolia RPC endpoint until the transaction receipt is available or timeout.
   *
   * @param transactionHash the transaction hash to wait for (0x-prefixed)
   * @throws Exception if the transaction is not confirmed within timeout or fails
   */
  private static void waitForTransactionReceipt(String transactionHash) throws Exception {
    int maxAttempts = 60; // 60 attempts
    int pollingIntervalMs = 2000; // 2 seconds between polls (total: 2 minutes max)

    Web3j web3j = Web3j.build(new HttpService(BASE_SEPOLIA_RPC));
    try {
      for (int attempt = 0; attempt < maxAttempts; attempt++) {
        Optional<TransactionReceipt> receipt =
            web3j.ethGetTransactionReceipt(transactionHash).send().getTransactionReceipt();

        if (receipt.isPresent()) {
          TransactionReceipt txReceipt = receipt.get();
          // Check if transaction was successful (status = "0x1")
          if ("0x1".equals(txReceipt.getStatus())) {
            System.out.println("  Confirmed in block: " + txReceipt.getBlockNumber());
            return;
          } else {
            throw new RuntimeException(
                "Transaction failed with status: " + txReceipt.getStatus());
          }
        }

        // Transaction not yet mined, wait and retry
        Thread.sleep(pollingIntervalMs);
      }

      throw new RuntimeException(
          "Timeout waiting for transaction confirmation after "
              + (maxAttempts * pollingIntervalMs / 1000)
              + " seconds");
    } finally {
      web3j.shutdown();
    }
  }
}
