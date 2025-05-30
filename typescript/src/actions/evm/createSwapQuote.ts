import {
  CreateSwapQuoteOptions,
  CreateSwapQuoteResult,
  SwapUnavailableResult,
} from "../../client/evm/evm.types.js";
import { CdpOpenApiClientType, CreateSwapQuoteResponse } from "../../openapi-client/index.js";
import { Address, Hex } from "../../types/misc.js";

/**
 * Creates a quote for a swap between two tokens on an EVM network.
 *
 * @param {CdpOpenApiClientType} client - The client to use to create the swap quote.
 * @param {CreateSwapQuoteOptions} options - The options for creating a swap quote.
 *
 * @returns {Promise<CreateSwapQuoteResult | SwapUnavailableResult>} A promise that resolves to the swap quote result or a response indicating that liquidity is unavailable.
 *
 * @example **Creating a swap quote**
 * ```ts
 * const swapQuote = await createSwapQuote(client, {
 *   network: "ethereum",
 *   buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
 *   sellToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
 *   sellAmount: BigInt("1000000000000000000"), // 1 WETH in wei
 *   taker: "0x1234567890123456789012345678901234567890"
 * });
 * ```
 */
export async function createSwapQuote(
  client: CdpOpenApiClientType,
  options: CreateSwapQuoteOptions,
): Promise<CreateSwapQuoteResult | SwapUnavailableResult> {
  // Call the createEvmSwapQuote function directly with the client's configured API
  const response = await client.createEvmSwapQuote({
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

  // At this point we know it's a CreateSwapQuoteResponse with liquidityAvailable as true
  const swapResponse = response as CreateSwapQuoteResponse;
  return {
    liquidityAvailable: true,
    buyToken: swapResponse.buyToken as Address,
    sellToken: swapResponse.sellToken as Address,
    sellAmount: BigInt(swapResponse.sellAmount),
    buyAmount: BigInt(swapResponse.buyAmount),
    minBuyAmount: BigInt(swapResponse.minBuyAmount),
    blockNumber: BigInt(swapResponse.blockNumber),
    fees: {
      gasFee: swapResponse.fees.gasFee
        ? {
            amount: BigInt(swapResponse.fees.gasFee.amount),
            token: swapResponse.fees.gasFee.token as Address,
          }
        : undefined,
      protocolFee: swapResponse.fees.protocolFee
        ? {
            amount: BigInt(swapResponse.fees.protocolFee.amount),
            token: swapResponse.fees.protocolFee.token as Address,
          }
        : undefined,
    },
    issues: {
      allowance: swapResponse.issues.allowance
        ? {
            currentAllowance: BigInt(swapResponse.issues.allowance.currentAllowance),
            spender: swapResponse.issues.allowance.spender as Address,
          }
        : undefined,
      balance: swapResponse.issues.balance
        ? {
            token: swapResponse.issues.balance.token as Address,
            currentBalance: BigInt(swapResponse.issues.balance.currentBalance),
            requiredBalance: BigInt(swapResponse.issues.balance.requiredBalance),
          }
        : undefined,
      simulationIncomplete: swapResponse.issues.simulationIncomplete,
    },
    gas: swapResponse.transaction?.gas ? BigInt(swapResponse.transaction.gas) : undefined,
    gasPrice: swapResponse.transaction?.gasPrice
      ? BigInt(swapResponse.transaction.gasPrice)
      : undefined,
    transaction: swapResponse.transaction
      ? {
          to: swapResponse.transaction.to as Address,
          data: swapResponse.transaction.data as Hex,
          value: swapResponse.transaction.value,
          gas: swapResponse.transaction.gas,
        }
      : undefined,
    permit2: swapResponse.permit2
      ? {
          eip712: {
            domain: {
              ...swapResponse.permit2.eip712.domain,
              verifyingContract: swapResponse.permit2.eip712.domain.verifyingContract as
                | Address
                | undefined,
              salt: swapResponse.permit2.eip712.domain.salt as Hex | undefined,
            },
            types: swapResponse.permit2.eip712.types,
            primaryType: swapResponse.permit2.eip712.primaryType,
            message: swapResponse.permit2.eip712.message,
          },
        }
      : undefined,
  };
}
