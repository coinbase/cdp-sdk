import {
  GetSwapPriceOptions,
  GetSwapPriceResult,
  SwapUnavailableResult,
} from "../../client/evm/evm.types.js";
import { CdpOpenApiClientType, GetSwapPriceResponse } from "../../openapi-client/index.js";
import { Address } from "../../types/misc.js";

/**
 * Gets the price for a swap between two tokens on an EVM network.
 *
 * @param {CdpOpenApiClientType} client - The client to use to get the swap price.
 * @param {GetSwapPriceOptions} options - The options for getting a swap price.
 *
 * @returns {Promise<GetSwapPriceResult | SwapUnavailableResult>} A promise that resolves to the swap price result or a response indicating that liquidity is unavailable.
 *
 * @example **Getting a swap price**
 * ```ts
 * const price = await getSwapPrice(client, {
 *   network: "ethereum-mainnet",
 *   buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
 *   sellToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
 *   sellAmount: BigInt("1000000000000000000"), // 1 WETH in wei
 *   taker: "0x1234567890123456789012345678901234567890"
 * });
 * ```
 */
export async function getSwapPrice(
  client: CdpOpenApiClientType,
  options: GetSwapPriceOptions,
): Promise<GetSwapPriceResult | SwapUnavailableResult> {
  // Call the getEvmSwapPrice function directly with the client's configured API
  const response = await client.getEvmSwapPrice({
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
    // Return the SwapUnavailableResult
    return {
      liquidityAvailable: false,
    };
  }

  // At this point we know it's a GetSwapPriceResponse with liquidityAvailable as true
  const quoteResponse = response as GetSwapPriceResponse;
  return {
    blockNumber: BigInt(quoteResponse.blockNumber),
    buyAmount: BigInt(quoteResponse.buyAmount),
    buyToken: quoteResponse.buyToken as Address,
    fees: {
      gasFee: quoteResponse.fees.gasFee
        ? {
            amount: BigInt(quoteResponse.fees.gasFee.amount),
            token: quoteResponse.fees.gasFee.token as Address,
          }
        : undefined,
      protocolFee: quoteResponse.fees.protocolFee
        ? {
            amount: BigInt(quoteResponse.fees.protocolFee.amount),
            token: quoteResponse.fees.protocolFee.token as Address,
          }
        : undefined,
    },
    issues: {
      allowance: quoteResponse.issues.allowance
        ? {
            currentAllowance: BigInt(quoteResponse.issues.allowance.currentAllowance),
            spender: quoteResponse.issues.allowance.spender as Address,
          }
        : undefined,
      balance: quoteResponse.issues.balance
        ? {
            token: quoteResponse.issues.balance.token as Address,
            currentBalance: BigInt(quoteResponse.issues.balance.currentBalance),
            requiredBalance: BigInt(quoteResponse.issues.balance.requiredBalance),
          }
        : undefined,
      simulationIncomplete: quoteResponse.issues.simulationIncomplete,
    },
    liquidityAvailable: true,
    minBuyAmount: BigInt(quoteResponse.minBuyAmount),
    sellAmount: BigInt(quoteResponse.sellAmount),
    sellToken: quoteResponse.sellToken as Address,
    gas: quoteResponse.gas ? BigInt(quoteResponse.gas) : undefined,
    gasPrice: quoteResponse.gasPrice ? BigInt(quoteResponse.gasPrice) : undefined,
  };
}
