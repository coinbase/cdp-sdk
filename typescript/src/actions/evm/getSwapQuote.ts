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
 * @param {EvmSwapsNetwork} options.network - The network to get a quote from (e.g., "ethereum", "ethereum-sepolia", "base").
 * @param {Address} options.buyToken - The token to buy (destination token address).
 * @param {Address} options.sellToken - The token to sell (source token address).
 * @param {bigint} options.sellAmount - The amount to sell in atomic units (wei) of the token.
 * @param {Address} options.taker - The address that will perform the swap.
 * @param {Address} [options.signerAddress] - The signer address (only needed if taker is a smart contract).
 * @param {bigint} [options.gasPrice] - The gas price in Wei.
 * @param {number} [options.slippageBps] - The slippage tolerance in basis points (0-10000).
 *
 * @returns {Promise<GetQuoteResponse | SwapUnavailableResponse>} A promise that resolves to the swap quote result or a response indicating that liquidity is unavailable.
 *
 * @example **Getting a swap quote**
 * ```ts
 * const quote = await getSwapQuote(client, {
 *   network: "ethereum-mainnet",
 *   buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
 *   sellToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
 *   sellAmount: BigInt("1000000000000000000"), // 1 WETH in wei
 *   taker: "0x1234567890123456789012345678901234567890"
 * });
 * ```
 *
 * @example **Calculating price ratio between tokens**
 * ```ts
 * // After getting a quote
 * if (quote.liquidityAvailable) {
 *   // Define token information
 *   const sellToken = { symbol: "WETH", decimals: 18 };
 *   const buyToken = { symbol: "USDC", decimals: 6 };
 *
 *   const sellAmountBigInt = BigInt(quote.sellAmount);
 *   const buyAmountBigInt = BigInt(quote.buyAmount);
 *
 *   // Calculate price: How many buyTokens per sellToken (e.g., USDC per WETH)
 *   const sellTokenPrice = Number(
 *     (buyAmountBigInt * BigInt(10 ** (18 - buyToken.decimals))) / 
 *     (sellAmountBigInt * BigInt(10 ** (18 - sellToken.decimals)))
 *   ) / (10 ** 18);
 *
 *   // Display price
 *   console.log(`1 ${sellToken.symbol} = ${sellTokenPrice.toLocaleString()} ${buyToken.symbol}`);
 * }
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
    sellAmount: options.sellAmount.toString(),
    taker: options.taker,
    signerAddress: options.signerAddress,
    gasPrice: options.gasPrice?.toString(),
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
