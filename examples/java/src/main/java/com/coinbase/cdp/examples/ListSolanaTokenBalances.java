package com.coinbase.cdp.examples;

import com.coinbase.cdp.types.ListSolanaTokenBalancesNetwork;

/** Lists token balances for a CDP Solana account with the generated Java client. */
public final class ListSolanaTokenBalances {
  private ListSolanaTokenBalances() {}

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    var balances =
        CdpClientFactory.create()
            .solanaTokenBalances()
            .listSolanaTokenBalances(
                ListSolanaTokenBalancesNetwork.valueOf(
                    EnvLoader.orDefault("CDP_SOLANA_BALANCE_NETWORK", "solana-devnet")),
                EnvLoader.required("CDP_SOLANA_ACCOUNT_ADDRESS"));

    System.out.println("Solana token balances: " + balances);
  }
}
