package com.coinbase.cdp.examples.enduser;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.examples.utils.EnvLoader;
import com.coinbase.cdp.openapi.model.EvmCall;
import com.coinbase.cdp.openapi.model.EvmUserOperationNetwork;
import com.coinbase.cdp.openapi.model.SendUserOperationWithEndUserAccountRequest;
import java.util.List;

/**
 * Example: Send a user operation on behalf of an end user.
 *
 * <p>This example requires the end user to have an active delegation on their account that allows
 * the developer to sign on their behalf.
 *
 * <p>User operations are sent through a smart account and can batch multiple calls together. This
 * example uses the CDP paymaster to sponsor gas fees.
 *
 * <p>Usage: ./gradlew runSendUserOperation --args="&lt;userId&gt;"
 */
public class SendUserOperation {

  public static void main(String[] args) throws Exception {
    if (args.length < 1) {
      System.err.println("Usage: SendUserOperation <userId>");
      System.exit(1);
    }

    String userId = args[0];
    EnvLoader.load();

    try (CdpClient cdp = CdpClient.create()) {
      // Get the end user to find their smart account address
      var endUser = cdp.endUser().getEndUser(userId);

      if (endUser.getEvmSmartAccountObjects().isEmpty()) {
        System.err.println("End user has no EVM smart accounts.");
        System.exit(1);
      }

      String address = endUser.getEvmSmartAccountObjects().get(0).getAddress();
      System.out.println("Sending user operation for user: " + userId);
      System.out.println("  Smart account address: " + address);
      System.out.println();

      var response =
          cdp.endUser()
              .sendUserOperation(
                  userId,
                  address,
                  new SendUserOperationWithEndUserAccountRequest()
                      .network(EvmUserOperationNetwork.BASE_SEPOLIA)
                      .calls(
                          List.of(
                              new EvmCall()
                                  .to(
                                      "0x0000000000000000000000000000000000000000")
                                  .value("0")
                                  .data("0x")))
                      .useCdpPaymaster(true));

      System.out.println("User operation sent successfully!");
      System.out.println("  User operation hash: " + response.getUserOpHash());
      System.out.println("  Status: " + response.getStatus());
    }
  }
}
