package com.coinbase.cdp.examples;

import com.coinbase.cdp.resources.evmaccounts.requests.SignEvmMessageRequest;

/** Signs an EIP-191 message with an existing CDP EVM account. */
public final class SignEvmMessage {
  private SignEvmMessage() {}

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    String address = EnvLoader.required("CDP_EVM_ACCOUNT_ADDRESS");
    String message =
        EnvLoader.orDefault("CDP_MESSAGE", "Hello from the CDP Java SDK!");
    var response =
        CdpClientFactory.create()
            .evmAccounts()
            .signEvmMessage(
                address, SignEvmMessageRequest.builder().message(message).build());

    System.out.println("Signed message: " + message);
    System.out.println("Signature: " + response.getSignature());
  }
}
