package com.coinbase.cdp.examples.enduser;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.examples.utils.EnvLoader;
import com.coinbase.cdp.openapi.model.ValidateEndUserAccessTokenRequest;

/**
 * Example: Validate an end user's access token.
 *
 * <p>This example demonstrates how to validate a CDP access token. The token should be provided via
 * the {@code CDP_ACCESS_TOKEN} environment variable.
 *
 * <p>Usage: ./gradlew runValidateAccessToken
 */
public class ValidateAccessToken {

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    String accessToken = System.getenv("CDP_ACCESS_TOKEN");
    if (accessToken == null || accessToken.isBlank()) {
      System.err.println("Error: CDP_ACCESS_TOKEN environment variable is not set.");
      System.err.println("Set it to a valid end user access token and try again.");
      System.exit(1);
    }

    try (CdpClient cdp = CdpClient.create()) {
      System.out.println("Validating access token...");

      var endUser =
          cdp.endUser()
              .validateAccessToken(
                  new ValidateEndUserAccessTokenRequest().accessToken(accessToken));

      System.out.println("Access token is valid!");
      System.out.println("  User ID: " + endUser.getUserId());
      System.out.println("  EVM accounts: " + endUser.getEvmAccountObjects().size());
      System.out.println(
          "  EVM smart accounts: " + endUser.getEvmSmartAccountObjects().size());
      System.out.println(
          "  Solana accounts: " + endUser.getSolanaAccountObjects().size());
    }
  }
}
