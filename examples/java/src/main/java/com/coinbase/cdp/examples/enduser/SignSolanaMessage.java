package com.coinbase.cdp.examples.enduser;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.examples.utils.EnvLoader;
import com.coinbase.cdp.openapi.model.SignSolanaMessageWithEndUserAccountRequest;
import java.util.Base64;

/**
 * Example: Sign a Solana message on behalf of an end user.
 *
 * <p>This example requires the end user to have an active delegation on their account that allows
 * the developer to sign on their behalf.
 *
 * <p>Usage: ./gradlew runSignSolanaMessage --args="&lt;userId&gt;"
 */
public class SignSolanaMessage {

  public static void main(String[] args) throws Exception {
    if (args.length < 1) {
      System.err.println("Usage: SignSolanaMessage <userId>");
      System.exit(1);
    }

    String userId = args[0];
    EnvLoader.load();

    try (CdpClient cdp = CdpClient.create()) {
      // Get the end user to find their Solana address
      var endUser = cdp.endUser().getEndUser(userId);

      if (endUser.getSolanaAccountObjects().isEmpty()) {
        System.err.println("End user has no Solana accounts.");
        System.exit(1);
      }

      String address = endUser.getSolanaAccountObjects().get(0).getAddress();
      String message = "Hello, World!";
      String encodedMessage = Base64.getEncoder().encodeToString(message.getBytes());

      System.out.println("Signing Solana message for user: " + userId);
      System.out.println("  Address: " + address);
      System.out.println("  Message: \"" + message + "\"");
      System.out.println();

      var response =
          cdp.endUser()
              .signSolanaMessage(
                  userId,
                  new SignSolanaMessageWithEndUserAccountRequest()
                      .message(encodedMessage)
                      .address(address));

      System.out.println("Message signed successfully!");
      System.out.println("  Signature: " + response.getSignature());
    }
  }
}
