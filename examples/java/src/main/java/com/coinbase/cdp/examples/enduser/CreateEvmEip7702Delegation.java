package com.coinbase.cdp.examples.enduser;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.examples.utils.EnvLoader;
import com.coinbase.cdp.openapi.model.CreateEvmEip7702DelegationWithEndUserAccountRequest;
import com.coinbase.cdp.openapi.model.EvmEip7702DelegationNetwork;

/**
 * Example: Create an EIP-7702 delegation for an end user.
 *
 * <p>This example requires the end user to have an active delegation on their account that allows
 * the developer to sign on their behalf.
 *
 * <p>EIP-7702 delegations allow an EOA to temporarily delegate control to a smart contract
 * implementation, enabling smart account features like batched transactions and paymasters.
 *
 * <p>Usage: ./gradlew runCreateEvmEip7702Delegation --args="&lt;userId&gt;"
 */
public class CreateEvmEip7702Delegation {

  public static void main(String[] args) throws Exception {
    if (args.length < 1) {
      System.err.println("Usage: CreateEvmEip7702Delegation <userId>");
      System.exit(1);
    }

    String userId = args[0];
    EnvLoader.load();

    try (CdpClient cdp = CdpClient.create()) {
      // First, get the end user to find their EVM address
      var endUser = cdp.endUser().getEndUser(userId);

      if (endUser.getEvmAccountObjects().isEmpty()) {
        System.err.println("End user has no EVM accounts.");
        System.exit(1);
      }

      String address = endUser.getEvmAccountObjects().get(0).getAddress();
      System.out.println("Creating EIP-7702 delegation for user: " + userId);
      System.out.println("  Address: " + address);
      System.out.println();

      var response =
          cdp.endUser()
              .createEvmEip7702Delegation(
                  userId,
                  new CreateEvmEip7702DelegationWithEndUserAccountRequest()
                      .address(address)
                      .network(EvmEip7702DelegationNetwork.BASE_SEPOLIA)
                      .enableSpendPermissions(true));

      System.out.println("EIP-7702 delegation created!");
      System.out.println("  Response: " + response);
    }
  }
}
