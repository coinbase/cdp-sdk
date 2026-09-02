package com.coinbase.cdp.examples;

import com.coinbase.cdp.types.ListEvmTokenBalancesNetwork;

/** Lists token balances for a CDP EVM account with the generated Java client. */
public final class ListEvmTokenBalances {
  private ListEvmTokenBalances() {}

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    var balances =
        CdpClientFactory.create()
            .evmTokenBalances()
            .listEvmTokenBalances(
                ListEvmTokenBalancesNetwork.valueOf(
                    EnvLoader.orDefault("CDP_EVM_BALANCE_NETWORK", "base-sepolia")),
                EnvLoader.required("CDP_EVM_ACCOUNT_ADDRESS"));

    System.out.println("EVM token balances: " + balances);
  }
}
