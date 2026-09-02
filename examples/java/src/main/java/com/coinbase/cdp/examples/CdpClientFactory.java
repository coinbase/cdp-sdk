package com.coinbase.cdp.examples;

import com.coinbase.cdp.CdpClient;

/** Creates a generated Java SDK client from the standard example environment variables. */
final class CdpClientFactory {
  private CdpClientFactory() {}

  static CdpClient create() {
    var builder =
        CdpClient.builder()
            .credentials(
                EnvLoader.required("CDP_API_KEY_ID"), EnvLoader.required("CDP_API_KEY_SECRET"));

    String walletSecret = EnvLoader.orDefault("CDP_WALLET_SECRET", "");
    if (!walletSecret.isBlank()) {
      builder.walletSecret(walletSecret);
    }

    return builder.build();
  }
}
