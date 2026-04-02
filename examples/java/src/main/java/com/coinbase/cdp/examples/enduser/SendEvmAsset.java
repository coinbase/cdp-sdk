package com.coinbase.cdp.examples.enduser;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.examples.utils.EnvLoader;
import com.coinbase.cdp.openapi.model.SendEvmAssetWithEndUserAccountRequest;

/**
 * Example: Send an EVM asset (USDC) on behalf of an end user.
 *
 * <p>This example requires the end user to have an active delegation on their account that allows
 * the developer to sign on their behalf.
 *
 * <p>Usage: ./gradlew runSendEvmAsset --args="&lt;userId&gt;"
 */
public class SendEvmAsset {

  public static void main(String[] args) throws Exception {
    if (args.length < 1) {
      System.err.println("Usage: SendEvmAsset <userId>");
      System.exit(1);
    }

    String userId = args[0];
    EnvLoader.load();

    try (CdpClient cdp = CdpClient.create()) {
      // Get the end user to find their EVM address
      var endUser = cdp.endUser().getEndUser(userId);

      if (endUser.getEvmAccountObjects().isEmpty()) {
        System.err.println("End user has no EVM accounts.");
        System.exit(1);
      }

      String address = endUser.getEvmAccountObjects().get(0).getAddress();
      System.out.println("Sending USDC for user: " + userId);
      System.out.println("  From address: " + address);
      System.out.println();

      var response =
          cdp.endUser()
              .sendEvmAsset(
                  userId,
                  address,
                  "usdc",
                  new SendEvmAssetWithEndUserAccountRequest()
                      .to("0x0000000000000000000000000000000000000000")
                      .amount("1000000")
                      .network(
                          SendEvmAssetWithEndUserAccountRequest.NetworkEnum
                              .BASE_SEPOLIA));

      System.out.println("Asset sent successfully!");
      System.out.println("  Transaction hash: " + response.getTransactionHash());
    }
  }
}
