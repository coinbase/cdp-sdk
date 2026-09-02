package com.coinbase.cdp.examples;

import com.coinbase.cdp.resources.faucets.requests.RequestEvmFaucetRequest;
import com.coinbase.cdp.resources.faucets.types.RequestEvmFaucetRequestNetwork;
import com.coinbase.cdp.resources.faucets.types.RequestEvmFaucetRequestToken;

/** Requests testnet EVM funds for an existing CDP EVM account. */
public final class RequestEvmFaucet {
  private RequestEvmFaucet() {}

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    var response =
        CdpClientFactory.create()
            .faucets()
            .requestEvmFaucet(
                RequestEvmFaucetRequest.builder()
                    .network(
                        RequestEvmFaucetRequestNetwork.valueOf(
                            EnvLoader.orDefault("CDP_FAUCET_NETWORK", "base-sepolia")))
                    .address(EnvLoader.required("CDP_EVM_ACCOUNT_ADDRESS"))
                    .token(
                        RequestEvmFaucetRequestToken.valueOf(
                            EnvLoader.orDefault("CDP_FAUCET_TOKEN", "eth")))
                    .build());

    System.out.println("Faucet response: " + response);
  }
}
