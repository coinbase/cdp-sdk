import { CreateSwapOptions } from "../../client/evm/evm.types.js";
import {
  CdpOpenApiClientType,
  CreateSwapResponse,
  SwapUnavailableResponse,
} from "../../openapi-client/index.js";

/**
 * Creates a swap between two tokens on an EVM network.
 *
 * @param {CdpOpenApiClientType} client - The client to use to create the swap.
 * @param {CreateSwapOptions} options - The options for creating a swap.
 * @param {EvmSwapsNetwork} options.network - The network to create a swap on (e.g., "ethereum", "ethereum-sepolia", "base").
 * @param {Address} options.buyToken - The token to buy (destination token address).
 * @param {Address} options.sellToken - The token to sell (source token address).
 * @param {bigint} options.sellAmount - The amount to sell in atomic units (wei) of the token.
 * @param {Address} options.taker - The address that will perform the swap.
 * @param {Address} [options.signerAddress] - The signer address (only needed if taker is a smart contract).
 * @param {bigint} [options.gasPrice] - The gas price in Wei.
 * @param {number} [options.slippageBps] - The slippage tolerance in basis points (0-10000).
 *
 * @returns {Promise<CreateSwapResponse | SwapUnavailableResponse>} A promise that resolves to the swap result or a response indicating that liquidity is unavailable.
 *
 * @example **Creating a swap**
 * ```ts
 * const swap = await createSwap(client, {
 *   network: "ethereum",
 *   buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
 *   sellToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
 *   sellAmount: BigInt("1000000000000000000"), // 1 WETH in wei
 *   taker: "0x1234567890123456789012345678901234567890"
 * });
 * ```
 *
 * @example **Calculating price ratio between tokens**
 * ```ts
 * // After creating a swap
 * if (swap.liquidityAvailable) {
 *   // Define token information
 *   const sellToken = { symbol: "WETH", decimals: 18 };
 *   const buyToken = { symbol: "USDC", decimals: 6 };
 *
 *   const sellAmountBigInt = BigInt(swap.sellAmount);
 *   const buyAmountBigInt = BigInt(swap.buyAmount);
 *   const minBuyAmountBigInt = BigInt(swap.minBuyAmount);
 *
 *   // Calculate exchange rate: How many buy tokens per 1 sell token
 *   const sellToBuyRate = Number(buyAmountBigInt) / (10 ** buyToken.decimals) *
 *     (10 ** sellToken.decimals) / Number(sellAmountBigInt);
 *
 *   // Calculate minimum exchange rate with slippage applied
 *   const minSellToBuyRate = Number(minBuyAmountBigInt) / (10 ** buyToken.decimals) *
 *     (10 ** sellToken.decimals) / Number(sellAmountBigInt);
 *
 *   // Calculate exchange rate: How many sell tokens per 1 buy token
 *   const buyToSellRate = Number(sellAmountBigInt) / (10 ** sellToken.decimals) *
 *     (10 ** buyToken.decimals) / Number(buyAmountBigInt);
 *
 *   // Calculate maximum exchange rate with slippage applied
 *   const maxBuyToSellRate = Number(sellAmountBigInt) / (10 ** sellToken.decimals) *
 *     (10 ** buyToken.decimals) / Number(minBuyAmountBigInt);
 *
 *   // Display both exchange rate directions
 *   console.log(`1 ${sellToken.symbol} = ${sellToBuyRate.toFixed(buyToken.decimals)} ${buyToken.symbol}`);
 *   console.log(`1 ${buyToken.symbol} = ${buyToSellRate.toFixed(sellToken.decimals)} ${sellToken.symbol}`);
 *
 *   // Display exchange rates with slippage applied
 *   console.log(`With slippage: 1 ${sellToken.symbol} = ${minSellToBuyRate.toFixed(buyToken.decimals)} ${buyToken.symbol} (minimum)`);
 *   console.log(`With slippage: 1 ${buyToken.symbol} = ${maxBuyToSellRate.toFixed(sellToken.decimals)} ${sellToken.symbol} (maximum)`);
 *   console.log(`Price impact: ${((sellToBuyRate - minSellToBuyRate) / sellToBuyRate * 100).toFixed(2)}%`);
 * }
 * ```
 */
export async function createSwap(
  client: CdpOpenApiClientType,
  options: CreateSwapOptions,
): Promise<CreateSwapResponse | SwapUnavailableResponse> {
  // Call the createEvmSwap function directly with the client's configured API
  const response = await client.createEvmSwap({
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
    // At this point we know it's a CreateSwapResponse since liquidityAvailable is true
    return response as CreateSwapResponse;
  }
}
