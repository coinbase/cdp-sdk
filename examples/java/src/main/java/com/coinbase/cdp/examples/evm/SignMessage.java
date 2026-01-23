package com.coinbase.cdp.examples.evm;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.examples.utils.EnvLoader;
import com.coinbase.cdp.openapi.api.EvmAccountsApi;
import com.coinbase.cdp.openapi.model.CreateEvmAccountRequest;
import com.coinbase.cdp.openapi.model.SignEvmMessageRequest;

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
      EvmAccountsApi evmApi = new EvmAccountsApi(cdp.getApiClient());

      // First, create an account to sign with
      System.out.println("Creating account...");
      var createRequest =
          new CreateEvmAccountRequest().name("sign-example-" + System.currentTimeMillis());
      String createJwt = cdp.generateWalletJwt("POST", "/v2/evm/accounts", createRequest);
      var account = evmApi.createEvmAccount(createJwt, null, createRequest);
      System.out.println("Account address: " + account.getAddress());
      System.out.println();

      // Sign a message
      String message = "Hello from CDP Java SDK!";
      System.out.println("Signing message: \"" + message + "\"");

      var signRequest = new SignEvmMessageRequest().message(message);
      String signJwt =
          cdp.generateWalletJwt(
              "POST", "/v2/evm/accounts/" + account.getAddress() + "/sign/message", signRequest);

      var signResponse = evmApi.signEvmMessage(account.getAddress(), signJwt, null, signRequest);

      System.out.println();
      System.out.println("Signature: " + signResponse.getSignature());
    }
  }
}
