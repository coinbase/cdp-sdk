package com.coinbase.cdp.examples;

import com.coinbase.cdp.resources.evmaccounts.requests.SignEvmTypedDataRequest;
import com.coinbase.cdp.types.Eip712Domain;
import com.coinbase.cdp.types.Eip712Message;
import com.coinbase.cdp.types.Eip712Types;
import java.util.List;
import java.util.Map;

/** Signs a simple EIP-712 Mail message with an existing CDP EVM account. */
public final class SignEvmTypedData {
  private SignEvmTypedData() {}

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    String address = EnvLoader.required("CDP_EVM_ACCOUNT_ADDRESS");
    Eip712Message message =
        Eip712Message.builder()
            .domain(Eip712Domain.builder().name("CDP Java SDK").version("1").chainId(84532L).build())
            .types(
                Eip712Types.of(
                    Map.of(
                        "EIP712Domain",
                        List.of(
                            Map.of("name", "name", "type", "string"),
                            Map.of("name", "version", "type", "string"),
                            Map.of("name", "chainId", "type", "uint256")),
                        "Mail",
                        List.of(
                            Map.of("name", "from", "type", "address"),
                            Map.of("name", "contents", "type", "string")))))
            .primaryType("Mail")
            .message(Map.of("from", address, "contents", "Hello from the CDP Java SDK!"))
            .build();

    var response =
        CdpClientFactory.create()
            .evmAccounts()
            .signEvmTypedData(
                address, SignEvmTypedDataRequest.builder().body(message).build());

    System.out.println("EIP-712 signature: " + response.getSignature());
  }
}
