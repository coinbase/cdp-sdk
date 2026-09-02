package com.coinbase.cdp.examples;

import com.coinbase.cdp.resources.evmswaps.requests.GetEvmSwapPriceRequest;
import com.coinbase.cdp.types.EvmSwapsNetwork;
import com.coinbase.cdp.types.FromAmount;
import com.coinbase.cdp.types.FromToken;
import com.coinbase.cdp.types.Taker;
import com.coinbase.cdp.types.ToToken;

/** Retrieves an EVM swap price estimate with the generated Java client. */
public final class GetEvmSwapPrice {
  private GetEvmSwapPrice() {}

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    var price =
        CdpClientFactory.create()
            .evmSwaps()
            .getEvmSwapPrice(
                GetEvmSwapPriceRequest.builder()
                    .network(EvmSwapsNetwork.valueOf(EnvLoader.orDefault("CDP_SWAP_NETWORK", "base")))
                    .toToken(
                        ToToken.of(
                            EnvLoader.orDefault(
                                "CDP_SWAP_TO_TOKEN",
                                "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE")))
                    .fromToken(
                        FromToken.of(
                            EnvLoader.orDefault(
                                "CDP_SWAP_FROM_TOKEN",
                                "0x833589fCD6EDB6E08f4c7C32D4f71b54bdA02913")))
                    .fromAmount(FromAmount.of(EnvLoader.orDefault("CDP_SWAP_FROM_AMOUNT", "1000000")))
                    .taker(Taker.of(EnvLoader.required("CDP_EVM_ACCOUNT_ADDRESS")))
                    .build());

    System.out.println("Swap price: " + price);
  }
}
