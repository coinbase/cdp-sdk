package com.coinbase.cdp.examples.evm;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.evm.options.GetOrCreateAccountOptions;
import com.coinbase.cdp.examples.utils.EnvLoader;

/**
 * Example: Get or create an EVM account.
 *
 * <p>This example demonstrates how to use the getOrCreateAccount method which retrieves an existing
 * account by name or creates a new one if it doesn't exist. This is useful for ensuring an account
 * with a specific name exists without having to handle the create/get logic yourself.
 *
 * <p>Usage: ./gradlew runGetOrCreateAccount
 */
public class GetOrCreateAccount {

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    try (CdpClient cdp = CdpClient.create()) {
      String accountName = "Account1";

      // Get or create an account - will create on first call, retrieve on subsequent calls
      var account =
          cdp.evm()
              .getOrCreateAccount(
                  GetOrCreateAccountOptions.builder().name(accountName).build());
      System.out.println("EVM Account Address: " + account.getAddress());

      // Calling again with the same name returns the same account
      var account2 =
          cdp.evm()
              .getOrCreateAccount(
                  GetOrCreateAccountOptions.builder().name(accountName).build());
      System.out.println("EVM Account 2 Address: " + account2.getAddress());

      boolean areAccountsEqual = account.getAddress().equals(account2.getAddress());
      System.out.println("Are accounts equal? " + areAccountsEqual);
    }
  }
}
