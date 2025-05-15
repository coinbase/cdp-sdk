import { GetSwapQuoteOptions, SwapQuote } from "../../client/evm/evm.types.js";
import { CdpOpenApiClientType, GetQuoteResponse } from "../../openapi-client/index.js";
import { Address } from "../../types/misc.js";

/**
 * Gets a quote for a swap between two tokens on an EVM network.
 *
 * @param {CdpOpenApiClientType} client - The client to use to get the swap quote.
 * @param {GetSwapQuoteOptions} options - The options for getting a swap quote.
 *
 * @returns {Promise<SwapQuote>} A promise that resolves to the swap quote result.
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
): Promise<SwapQuote> {
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
    throw new Error("Swap unavailable: insufficient liquidity");
  }

  // At this point we know it's a GetQuoteResponse since liquidityAvailable is true
  const quoteResponse = response as GetQuoteResponse;

  return {
    blockNumber: quoteResponse.blockNumber,
    buyAmount: quoteResponse.buyAmount,
    buyToken: quoteResponse.buyToken as Address,
    fees: {
      gasFee: quoteResponse.fees.gasFee
        ? {
            amount: quoteResponse.fees.gasFee.amount,
            token: quoteResponse.fees.gasFee.token as Address,
          }
        : null,
      protocolFee: quoteResponse.fees.protocolFee
        ? {
            amount: quoteResponse.fees.protocolFee.amount,
            token: quoteResponse.fees.protocolFee.token as Address,
          }
        : null,
    },
    issues: {
      allowance: quoteResponse.issues.allowance
        ? {
            currentAllowance: quoteResponse.issues.allowance.currentAllowance,
            spender: quoteResponse.issues.allowance.spender as Address,
          }
        : null,
      balance: quoteResponse.issues.balance
        ? {
            token: quoteResponse.issues.balance.token as Address,
            currentBalance: quoteResponse.issues.balance.currentBalance,
            requiredBalance: quoteResponse.issues.balance.requiredBalance,
          }
        : null,
      simulationIncomplete: quoteResponse.issues.simulationIncomplete,
    },
    liquidityAvailable: quoteResponse.liquidityAvailable,
    minBuyAmount: quoteResponse.minBuyAmount,
    sellAmount: quoteResponse.sellAmount,
    sellToken: quoteResponse.sellToken as Address,
    gas: quoteResponse.gas,
    gasPrice: quoteResponse.gasPrice,
  };
}
