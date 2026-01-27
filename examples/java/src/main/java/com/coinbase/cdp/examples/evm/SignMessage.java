package com.coinbase.cdp.examples.evm;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.evm.options.CreateAccountOptions;
import com.coinbase.cdp.evm.options.SignMessageOptions;
import com.coinbase.cdp.examples.utils.EnvLoader;

/**
 * Example: Sign a message with an EVM account.
 *
 * <p>This example demonstrates how to sign an arbitrary message using an EVM account. This is
 * useful for authentication, proving ownership, and off-chain signatures.
 *
 * <p>Usage: ./gradlew runSignMessage
 */
public class SignMessage {

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    try (CdpClient cdp = CdpClient.create()) {
      // First, create an account to sign with
      System.out.println("Creating account...");
      var account =
          cdp.evm()
              .createAccount(
                  CreateAccountOptions.builder()
                      .name("sign-example-" + System.currentTimeMillis())
                      .build());
      System.out.println("Account address: " + account.getAddress());
      System.out.println();

      // Sign a message
      String message = "Hello from CDP Java SDK!";
      System.out.println("Signing message: \"" + message + "\"");

      var signResponse =
          cdp.evm()
              .signMessage(
                  SignMessageOptions.builder()
                      .address(account.getAddress())
                      .message(message)
                      .build());

      System.out.println();
      System.out.println("Signature: " + signResponse.getSignature());
    }
  }
}
