package com.coinbase.cdp.examples.solana;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.client.solana.SolanaClientOptions.TransferOptions;
import com.coinbase.cdp.examples.utils.EnvLoader;
import com.coinbase.cdp.openapi.model.CreateSolanaAccountRequest;
import com.coinbase.cdp.openapi.model.RequestSolanaFaucetRequest;
import com.coinbase.cdp.openapi.model.SendSolanaTransactionRequest.NetworkEnum;
import java.math.BigInteger;
import java.util.List;
import org.p2p.solanaj.rpc.RpcClient;

/**
 * Example: Transfer SOL between Solana accounts.
 *
 * <p>This example demonstrates how to use the high-level transfer API to send SOL between two
 * accounts. It creates a sender and receiver account, funds the sender from the faucet, waits for
 * confirmation, and then transfers SOL to the receiver.
 *
 * <p>Usage: ./gradlew runSolanaTransfer
 */
public class Transfer {

  private static final String SOLANA_DEVNET_RPC = "https://api.devnet.solana.com";

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    try (CdpClient cdp = CdpClient.create()) {
      // Create sender account
      System.out.println("Creating sender account...");
      var sender =
          cdp.solana()
              .createAccount(
                  new CreateSolanaAccountRequest()
                      .name("sol-sender-" + System.currentTimeMillis()));
      System.out.println("Sender address: " + sender.getAddress());

      // Use a well-known recipient address (same as TypeScript example)
      // This is an existing account that doesn't require rent-exempt initialization
      String receiverAddress = "3KzDtddx4i53FBkvCzuDmRbaMozTZoJBb1TToWhz3JfE";
      System.out.println("Receiver address: " + receiverAddress);

      // Fund sender with SOL from faucet
      System.out.println("\nRequesting testnet SOL from faucet...");
      var faucetResponse =
          cdp.solana()
              .requestFaucet(
                  new RequestSolanaFaucetRequest()
                      .address(sender.getAddress())
                      .token(RequestSolanaFaucetRequest.TokenEnum.SOL));
      System.out.println("Faucet signature: " + faucetResponse.getTransactionSignature());

      // Wait for faucet transaction to be confirmed
      System.out.println("Waiting for faucet transaction to be confirmed...");
      waitForTransactionConfirmation(faucetResponse.getTransactionSignature());
      System.out.println("Faucet transaction confirmed!");

      // Small delay to ensure state is propagated
      Thread.sleep(2000);

      // Transfer SOL (0.0001 SOL = 100,000 lamports)
      System.out.println("\nTransferring 0.0001 SOL to receiver...");
      var result =
          cdp.solana()
              .transfer(
                  sender.getAddress(),
                  TransferOptions.builder()
                      .to(receiverAddress)
                      .amount(new BigInteger("100000")) // 0.0001 SOL in lamports
                      .token("sol")
                      .network(NetworkEnum.SOLANA_DEVNET)
                      .build());

      System.out.println("\nTransfer successful!");
      System.out.println("Transaction signature: " + result.getTransactionSignature());
      System.out.println(
          "View on explorer: https://explorer.solana.com/tx/"
              + result.getTransactionSignature()
              + "?cluster=devnet");
    }
  }

  /**
   * Waits for a Solana transaction to be confirmed.
   *
   * <p>Polls the Solana RPC endpoint until the transaction signature is confirmed.
   *
   * @param signature the transaction signature to wait for
   * @throws Exception if the transaction is not confirmed within timeout
   */
  private static void waitForTransactionConfirmation(String signature) throws Exception {
    int maxAttempts = 60; // 60 attempts
    int pollingIntervalMs = 2000; // 2 seconds between polls (total: 2 minutes max)

    RpcClient rpcClient = new RpcClient(SOLANA_DEVNET_RPC);

    for (int attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        var statuses = rpcClient.getApi().getSignatureStatuses(List.of(signature), true);
        if (statuses != null && statuses.getValue() != null && !statuses.getValue().isEmpty()) {
          var status = statuses.getValue().get(0);
          if (status != null) {
            String confirmationStatus = status.getConfirmationStatus();
            if ("finalized".equals(confirmationStatus) || "confirmed".equals(confirmationStatus)) {
              System.out.println("  Confirmed with status: " + confirmationStatus);
              return;
            }
          }
        }
      } catch (Exception e) {
        // Transaction not yet visible, continue polling
      }

      Thread.sleep(pollingIntervalMs);
    }

    throw new RuntimeException(
        "Timeout waiting for transaction confirmation after "
            + (maxAttempts * pollingIntervalMs / 1000)
            + " seconds");
  }
}
