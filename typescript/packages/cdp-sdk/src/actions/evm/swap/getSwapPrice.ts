import {
  GetSwapPriceOptions,
  GetSwapPriceResult,
  SwapUnavailableResult,
} from "../../../client/evm/evm.types.js";
import { CdpOpenApiClientType, GetSwapPriceResponse } from "../../../openapi-client/index.js";
import { Address } from "../../../types/misc.js";

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
 *   toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
 *   fromToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
 *   fromAmount: BigInt("1000000000000000000"), // 1 WETH in wei
 *   taker: "0x1234567890123456789012345678901234567890",
 *   idempotencyKey: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" // Optional: for request deduplication
 * });
 * ```
 */
export async function getSwapPrice(
  client: CdpOpenApiClientType,
  options: GetSwapPriceOptions,
): Promise<GetSwapPriceResult | SwapUnavailableResult> {
  // Call the getEvmSwapPrice function directly with the client's configured API
  const response = await client.getEvmSwapPrice(
    {
      network: options.network,
      toToken: options.toToken,
      fromToken: options.fromToken,
      fromAmount: options.fromAmount.toString(),
      taker: options.taker,
      signerAddress: options.signerAddress,
      gasPrice: options.gasPrice?.toString(),
      slippageBps: options.slippageBps,
    },
    options.idempotencyKey,
  );

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
    toAmount: BigInt(quoteResponse.toAmount),
    toToken: quoteResponse.toToken as Address,
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
    minToAmount: BigInt(quoteResponse.minToAmount),
    fromAmount: BigInt(quoteResponse.fromAmount),
    fromToken: quoteResponse.fromToken as Address,
    gas: quoteResponse.gas ? BigInt(quoteResponse.gas) : undefined,
    gasPrice: quoteResponse.gasPrice ? BigInt(quoteResponse.gasPrice) : undefined,
  };
}
