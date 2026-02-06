package com.coinbase.cdp.examples.evm;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.examples.utils.EnvLoader;

/**
 * Example: List all EVM accounts.
 *
 * <p>This example demonstrates how to list all EVM accounts in your CDP project using the
 * high-level API.
 *
 * <p>Alternative initialization using the builder pattern:
 *
 * <pre>{@code
 * CdpClient cdp = CdpClient.builder()
 *     .credentials("api-key-id", "api-key-secret")
 *     .build();
 * }</pre>
 *
 * <p>Usage: ./gradlew runListEvmAccounts
 */
public class ListAccounts {

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    try (CdpClient cdp = CdpClient.create()) {
      // Use the high-level API - no wallet JWT needed for read operations
      var response = cdp.evm().listAccounts();

      System.out.println("EVM Accounts (" + response.getAccounts().size() + " total):");
      System.out.println();

      for (var account : response.getAccounts()) {
        System.out.println("  Address: " + account.getAddress());
        System.out.println("  Name: " + (account.getName() != null ? account.getName() : "(none)"));
        System.out.println();
      }

      if (response.getAccounts().isEmpty()) {
        System.out.println("  No accounts found. Run CreateAccount first.");
      }
    }
  }
}
