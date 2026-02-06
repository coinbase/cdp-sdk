package com.coinbase.cdp.examples.evm;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.examples.utils.EnvLoader;
import com.coinbase.cdp.openapi.model.CreateEvmAccountRequest;
import com.coinbase.cdp.openapi.model.SignEvmMessageRequest;

/**
 * Example: Sign a message with an EVM account.
 *
 * <p>This example demonstrates how to sign an arbitrary message using an EVM account. This is
 * useful for authentication, proving ownership, and off-chain signatures.
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
 * <p>Usage: ./gradlew runSignMessage
 */
public class SignMessage {

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    try (CdpClient cdp = CdpClient.create()) {
      // First, create an account to sign with using the high-level API
      System.out.println("Creating account...");
      var account =
          cdp.evm()
              .createAccount(
                  new CreateEvmAccountRequest().name("sign-example-" + System.currentTimeMillis()));
      System.out.println("Account address: " + account.getAddress());
      System.out.println();

      // Sign a message using the high-level API
      String message = "Hello from CDP Java SDK!";
      System.out.println("Signing message: \"" + message + "\"");

      var signResponse =
          cdp.evm().signMessage(account.getAddress(), new SignEvmMessageRequest().message(message));

      System.out.println();
      System.out.println("Signature: " + signResponse.getSignature());
    }
  }
}
