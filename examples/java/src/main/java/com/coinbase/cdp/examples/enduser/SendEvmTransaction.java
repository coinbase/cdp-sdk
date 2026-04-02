package com.coinbase.cdp.examples.enduser;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.examples.utils.EnvLoader;
import com.coinbase.cdp.openapi.model.SendEvmTransactionWithEndUserAccountRequest;

/**
 * Example: Send an EVM transaction on behalf of an end user.
 *
 * <p>This example requires the end user to have an active delegation on their account that allows
 * the developer to sign on their behalf.
 *
 * <p>Usage: ./gradlew runSendEvmTransaction --args="&lt;userId&gt;"
 */
public class SendEvmTransaction {

  public static void main(String[] args) throws Exception {
    if (args.length < 1) {
      System.err.println("Usage: SendEvmTransaction <userId>");
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
      System.out.println("Sending EVM transaction for user: " + userId);
      System.out.println("  Address: " + address);
      System.out.println();

      var response =
          cdp.endUser()
              .sendEvmTransaction(
                  userId,
                  new SendEvmTransactionWithEndUserAccountRequest()
                      .transaction("0x02f86c84014a34008203e8830186a09400000000000000000000000000000000000000008080c0808080")
                      .address(address)
                      .network(
                          SendEvmTransactionWithEndUserAccountRequest.NetworkEnum
                              .BASE_SEPOLIA));

      System.out.println("Transaction sent successfully!");
      System.out.println("  Transaction hash: " + response.getTransactionHash());
    }
  }
}
