import { GetSwapQuoteOptions } from "../../client/evm/evm.types.js";
import {
  CdpOpenApiClientType,
  GetQuoteResponse,
  SwapUnavailableResponse,
} from "../../openapi-client/index.js";

/**
 * Gets a quote for a swap between two tokens on an EVM network.
 *
 * @param {CdpOpenApiClientType} client - The client to use to get the swap quote.
 * @param {GetSwapQuoteOptions} options - The options for getting a swap quote.
 *
 * @returns {Promise<GetQuoteResponse | SwapUnavailableResponse>} A promise that resolves to the swap quote result or a response indicating that liquidity is unavailable.
 *
 * @example
 * ```ts
 * const quote = await getSwapQuote(client, {
 *   network: "ethereum-mainnet",
 *   buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
 *   sellToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
 *   sellAmount: "1000000000000000000", // 1 WETH in wei
 *   taker: "0x1234567890123456789012345678901234567890"
 * });
 * ```
 */
export async function getSwapQuote(
  client: CdpOpenApiClientType,
  options: GetSwapQuoteOptions,
): Promise<GetQuoteResponse | SwapUnavailableResponse> {
  // Call the getEvmSwapQuote function directly with the client's configured API
  const response = await client.getEvmSwapQuote({
    network: options.network,
    buyToken: options.buyToken,
    sellToken: options.sellToken,
    sellAmount: options.sellAmount,
    taker: options.taker,
    signerAddress: options.signerAddress,
    gasPrice: options.gasPrice,
    slippageBps: options.slippageBps,
  });

  // Check if liquidity is unavailable
  if (!response.liquidityAvailable) {
    // Return the SwapUnavailableResponse
    return response as SwapUnavailableResponse;
  } else {
    // At this point we know it's a GetQuoteResponse since liquidityAvailable is true
    return response as GetQuoteResponse;
  }
}
