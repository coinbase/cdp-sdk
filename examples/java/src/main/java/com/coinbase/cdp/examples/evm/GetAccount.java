package com.coinbase.cdp.examples.evm;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.evm.options.GetAccountOptions;
import com.coinbase.cdp.examples.utils.EnvLoader;

/**
 * Example: Get an EVM account by address.
 *
 * <p>This example demonstrates how to retrieve a specific EVM account by its address.
 *
 * <p>Usage: ./gradlew runGetEvmAccount
 *
 * <p>Note: This example first lists accounts to get an address, then retrieves it. In practice,
 * you would use a known address.
 */
public class GetAccount {

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    try (CdpClient cdp = CdpClient.create()) {
      // First, get an address to look up
      // In practice, you would use a known address
      var accounts = cdp.evm().listAccounts();

      if (accounts.getAccounts().isEmpty()) {
        System.out.println("No accounts found. Run CreateAccount first.");
        return;
      }

      String address = accounts.getAccounts().get(0).getAddress();
      System.out.println("Looking up account: " + address);
      System.out.println();

      // Get the account by address
      var account = cdp.evm().getAccount(GetAccountOptions.builder().address(address).build());

      System.out.println("Account details:");
      System.out.println("  Address: " + account.getAddress());
      System.out.println("  Name: " + (account.getName() != null ? account.getName() : "(none)"));
    }
  }
}
