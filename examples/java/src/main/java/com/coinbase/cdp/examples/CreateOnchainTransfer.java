package com.coinbase.cdp.examples;

import com.coinbase.cdp.resources.transfers.requests.TransferRequest;
import com.coinbase.cdp.types.AccountId;
import com.coinbase.cdp.types.Asset;
import com.coinbase.cdp.types.BlockchainAddress;
import com.coinbase.cdp.types.CreateTransferSource;
import com.coinbase.cdp.types.OnchainAddress;
import com.coinbase.cdp.types.PaymentNetwork;
import com.coinbase.cdp.types.PositiveDecimal;
import com.coinbase.cdp.types.TransferTarget;
import com.coinbase.cdp.types.TransfersAccount;
import java.util.UUID;

/**
 * Creates a flexible custody transfer quote by default, or submits a live transfer after explicit
 * confirmation.
 */
public final class CreateOnchainTransfer {
  private CreateOnchainTransfer() {}

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    boolean execute = Boolean.parseBoolean(EnvLoader.orDefault("CDP_TRANSFER_EXECUTE", "false"));
    if (execute
        && !"I_UNDERSTAND".equals(EnvLoader.orDefault("CDP_TRANSFER_CONFIRMATION", ""))) {
      throw new IllegalStateException(
          "A live transfer requires CDP_TRANSFER_CONFIRMATION=I_UNDERSTAND.");
    }

    String sourceAsset = EnvLoader.orDefault("CDP_TRANSFER_SOURCE_ASSET", "usd");
    String targetAsset = EnvLoader.orDefault("CDP_TRANSFER_TARGET_ASSET", "usdc");
    TransferRequest request =
        TransferRequest.builder()
            .source(
                CreateTransferSource.of(
                    TransfersAccount.builder()
                        .accountId(AccountId.of(EnvLoader.required("CDP_CUSTODY_ACCOUNT_ID")))
                        .asset(Asset.of(sourceAsset))
                        .build()))
            .target(
                TransferTarget.of(
                    OnchainAddress.builder()
                        .address(
                            BlockchainAddress.of(
                                EnvLoader.required("CDP_TRANSFER_TARGET_ADDRESS")))
                        .network(
                            PaymentNetwork.valueOf(
                                EnvLoader.orDefault("CDP_TRANSFER_TARGET_NETWORK", "base")))
                        .asset(Asset.of(targetAsset))
                        .build()))
            .amount(PositiveDecimal.of(EnvLoader.required("CDP_TRANSFER_AMOUNT")))
            .asset(Asset.of(sourceAsset))
            .execute(execute)
            .idempotencyKey(UUID.randomUUID().toString())
            .build();

    var transfer = CdpClientFactory.create().transfers().createTransfer(request);
    System.out.println(execute ? "Submitted transfer: " + transfer : "Transfer quote: " + transfer);
  }
}
