package com.coinbase.cdp.examples.custody;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.examples.utils.EnvLoader;
import com.coinbase.cdp.openapi.api.AccountsApi;
import com.coinbase.cdp.openapi.api.TransfersApi;
import com.coinbase.cdp.openapi.model.CreateTransferSource;
import com.coinbase.cdp.openapi.model.Network;
import com.coinbase.cdp.openapi.model.OnchainAddress;
import com.coinbase.cdp.openapi.model.TransferRequest;
import com.coinbase.cdp.openapi.model.TransferStatus;
import com.coinbase.cdp.openapi.model.TransferTarget;
import com.coinbase.cdp.openapi.model.TransfersAccount;

/**
 * Example: Flexible Custody API flow.
 *
 * <p>Demonstrates listing accounts, checking balances, creating a quoted transfer,
 * and listing recent transfers using the auto-generated OpenAPI client.
 *
 * <p>Usage: ./gradlew runCustodyTransfer
 */
public class ListAccountsAndTransfer {

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    try (CdpClient cdp = CdpClient.create()) {
      var apiClient = cdp.getApiClient();
      AccountsApi accountsApi = new AccountsApi(apiClient);
      TransfersApi transfersApi = new TransfersApi(apiClient);

      // 1. List accounts
      var accountsResponse = accountsApi.listFoundationAccounts(null, null, null);
      var accounts = accountsResponse.getAccounts();
      System.out.printf("Found %d accounts:%n", accounts.size());
      for (var account : accounts) {
        System.out.printf("  %s (%s) - type: %s%n",
            account.getAccountId(), account.getName(), account.getType());
      }

      if (accounts.isEmpty()) {
        System.out.println("No accounts found. Create one in the CDP dashboard first.");
        return;
      }

      // 2. Get balances for the first account
      var account = accounts.get(0);
      var balancesResponse = accountsApi.listBalances(account.getAccountId(), null, null);
      System.out.printf("%nBalances for %s:%n", account.getName());
      for (var balance : balancesResponse.getBalances()) {
        System.out.printf("  %s: %s%n", balance.getAsset(), balance.getAmount());
      }

      // 3. Create a quoted transfer (execute=false — no funds move)
      var source = new CreateTransferSource();
      source.setActualInstance(new TransfersAccount().accountId(account.getAccountId()).asset("usd"));

      var target = new TransferTarget();
      target.setActualInstance(new OnchainAddress()
          .address("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913")
          .network(Network.BASE)
          .asset("usdc"));

      var transferRequest = new TransferRequest()
          .source(source)
          .target(target)
          .amount("10.00")
          .asset("usd")
          .execute(false);

      var transfer = transfersApi.createTransfer(null, transferRequest);
      System.out.printf("%nCreated transfer %s:%n", transfer.getTransferId());
      System.out.printf("  Status: %s%n", transfer.getStatus());
      System.out.printf("  Source: %s %s%n", transfer.getSourceAmount(), transfer.getSourceAsset());
      System.out.printf("  Target: %s %s%n", transfer.getTargetAmount(), transfer.getTargetAsset());
      System.out.printf("  Expires: %s%n", transfer.getExpiresAt());

      // 4. List recent transfers
      var transfersResponse = transfersApi.listTransfers(
          TransferStatus.QUOTED, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);
      System.out.printf("%n%d quoted transfers found.%n",
          transfersResponse.getTransfers().size());
    }
  }
}
