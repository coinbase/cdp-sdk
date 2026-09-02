package com.coinbase.cdp.examples;

import com.coinbase.cdp.resources.evmaccounts.requests.SendEvmTransactionRequest;
import com.coinbase.cdp.resources.evmaccounts.types.SendEvmTransactionRequestNetwork;
import java.util.UUID;

/**
 * Signs and sends an unsigned EIP-1559 transaction encoded as RLP hex from a CDP EVM account.
 *
 * <p>Set {@code CDP_EVM_ACCOUNT_ADDRESS} and {@code CDP_EVM_TRANSACTION}. The transaction should
 * include its recipient, value, and optional calldata; CDP manages nonce and gas estimation.
 */
public final class SendEvmTransaction {
  private SendEvmTransaction() {}

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    String address = EnvLoader.required("CDP_EVM_ACCOUNT_ADDRESS");
    String transaction = EnvLoader.required("CDP_EVM_TRANSACTION");
    var response =
        CdpClientFactory.create()
            .evmAccounts()
            .sendEvmTransaction(
                address,
                SendEvmTransactionRequest.builder()
                    .network(SendEvmTransactionRequestNetwork.BASE_SEPOLIA)
                    .transaction(transaction)
                    .idempotencyKey(UUID.randomUUID().toString())
                    .build());

    System.out.println("Transaction submitted: " + response.getTransactionHash());
    System.out.println("View on explorer: https://sepolia.basescan.org/tx/" + response.getTransactionHash());
  }
}
