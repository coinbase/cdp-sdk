package com.coinbase.cdp.examples;

import com.coinbase.cdp.core.CdpClientHttpResponse;
import com.coinbase.cdp.resources.evmaccounts.types.ListEvmAccountsResponse;

/**
 * Opt-in HTTP metadata access through {@code withRawResponse()}.
 *
 * <p>Set {@code CDP_API_KEY_ID} and {@code CDP_API_KEY_SECRET} before running:
 * {@code ./gradlew runGeneratedJava -PgeneratedJavaMainClass=com.coinbase.cdp.examples.RawResponse}.
 */
public final class RawResponse {
  private RawResponse() {}

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    CdpClientHttpResponse<ListEvmAccountsResponse> response =
        CdpClientFactory.create().evmAccounts().withRawResponse().listEvmAccounts();

    System.out.println("EVM accounts: " + response.body().getAccounts().size());
    System.out.println("Response headers: " + response.headers());
  }

}
