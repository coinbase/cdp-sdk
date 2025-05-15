import { CreateSwapOptions, Swap } from "../../client/evm/evm.types.js";
import { CdpOpenApiClientType, CreateSwapResponse } from "../../openapi-client/index.js";
import { Address, Hex } from "../../types/misc.js";

/**
 * Creates a swap between two tokens on an EVM network.
 *
 * @param {CdpOpenApiClientType} client - The client to use to create the swap.
 * @param {CreateSwapOptions} options - The options for creating a swap.
 *
 * @returns {Promise<Swap>} A promise that resolves to the swap result.
 *
 * @example
 * ```ts
 * const swap = await createSwap(client, {
 *   network: "ethereum",
 *   buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
 *   sellToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
 *   sellAmount: "1000000000000000000", // 1 WETH in wei
 *   taker: "0x1234567890123456789012345678901234567890"
 * });
 * ```
 */
export async function createSwap(
  client: CdpOpenApiClientType,
  options: CreateSwapOptions,
): Promise<Swap> {
  // Call the createEvmSwap function directly with the client's configured API
  const response = await client.createEvmSwap({
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

  // At this point we know it's a CreateSwapResponse since liquidityAvailable is true
  const swapResponse = response as CreateSwapResponse;

  return {
    blockNumber: swapResponse.blockNumber,
    buyAmount: swapResponse.buyAmount,
    buyToken: swapResponse.buyToken as Address,
    fees: {
      gasFee: swapResponse.fees.gasFee
        ? {
            amount: swapResponse.fees.gasFee.amount,
            token: swapResponse.fees.gasFee.token as Address,
          }
        : null,
      protocolFee: swapResponse.fees.protocolFee
        ? {
            amount: swapResponse.fees.protocolFee.amount,
            token: swapResponse.fees.protocolFee.token as Address,
          }
        : null,
    },
    issues: {
      allowance: swapResponse.issues.allowance
        ? {
            currentAllowance: swapResponse.issues.allowance.currentAllowance,
            spender: swapResponse.issues.allowance.spender as Address,
          }
        : null,
      balance: swapResponse.issues.balance
        ? {
            token: swapResponse.issues.balance.token as Address,
            currentBalance: swapResponse.issues.balance.currentBalance,
            requiredBalance: swapResponse.issues.balance.requiredBalance,
          }
        : null,
      simulationIncomplete: swapResponse.issues.simulationIncomplete,
    },
    liquidityAvailable: swapResponse.liquidityAvailable,
    minBuyAmount: swapResponse.minBuyAmount,
    sellAmount: swapResponse.sellAmount,
    sellToken: swapResponse.sellToken as Address,
    permit2: swapResponse.permit2
      ? {
          hash: swapResponse.permit2.hash as Hex,
          eip712: swapResponse.permit2.eip712,
        }
      : null,
    transaction: {
      to: swapResponse.transaction.to as Address,
      data: swapResponse.transaction.data as Hex,
      gas: swapResponse.transaction.gas,
      gasPrice: swapResponse.transaction.gasPrice,
      value: swapResponse.transaction.value,
    },
  };
}
