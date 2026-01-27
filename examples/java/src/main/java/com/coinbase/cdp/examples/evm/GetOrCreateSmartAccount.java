package com.coinbase.cdp.examples.evm;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.evm.options.GetOrCreateAccountOptions;
import com.coinbase.cdp.evm.options.GetOrCreateSmartAccountOptions;
import com.coinbase.cdp.examples.utils.EnvLoader;

/**
 * Example: Get or create an EVM smart account.
 *
 * <p>This example demonstrates how to use the getOrCreateSmartAccount method which retrieves an
 * existing smart account by name or creates a new one if it doesn't exist.
 *
 * <p>Usage: ./gradlew runGetOrCreateSmartAccount
 */
public class GetOrCreateSmartAccount {

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    try (CdpClient cdp = CdpClient.create()) {
      // First, get or create an owner account
      var owner =
          cdp.evm()
              .getOrCreateAccount(GetOrCreateAccountOptions.builder().name("SmartAccountOwner").build());
      System.out.println("Owner account address: " + owner.getAddress());

      // Get or create a smart account with the owner
      // Note: Each owner can only have one smart account per name
      var smartAccount =
          cdp.evm()
              .getOrCreateSmartAccount(
                  GetOrCreateSmartAccountOptions.builder()
                      .ownerAddress(owner.getAddress())
                      .name("MySmartAccount")
                      .build());
      System.out.println("Smart Account Address: " + smartAccount.getAddress());

      // Subsequent calls with the same name will return the existing account
      var sameAccount =
          cdp.evm()
              .getOrCreateSmartAccount(
                  GetOrCreateSmartAccountOptions.builder()
                      .ownerAddress(owner.getAddress())
                      .name("MySmartAccount")
                      .build());
      System.out.println("Retrieved same account: " + sameAccount.getAddress());

      boolean areAccountsEqual = smartAccount.getAddress().equals(sameAccount.getAddress());
      System.out.println("Are accounts equal? " + areAccountsEqual);

      // To create multiple smart accounts, you need different owners or names
      var anotherOwner =
          cdp.evm()
              .getOrCreateAccount(
                  GetOrCreateAccountOptions.builder().name("AnotherSmartAccountOwner").build());
      System.out.println("\nAnother owner account address: " + anotherOwner.getAddress());

      var differentAccount =
          cdp.evm()
              .getOrCreateSmartAccount(
                  GetOrCreateSmartAccountOptions.builder()
                      .ownerAddress(anotherOwner.getAddress())
                      .name("DifferentSmartAccount")
                      .build());
      System.out.println("Different Smart Account Address: " + differentAccount.getAddress());
    }
  }
}
