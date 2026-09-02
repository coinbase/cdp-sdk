package com.coinbase.cdp.examples;


/** Lists Solana accounts with the generated Java client. */
public final class ListSolanaAccounts {
  private ListSolanaAccounts() {}

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    var accounts = CdpClientFactory.create().solanaAccounts().listSolanaAccounts();
    System.out.println("Solana accounts: " + accounts);
  }
}
