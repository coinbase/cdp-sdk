import { formatUnits } from "viem";

import { UserInputValidationError } from "../../../errors.js";
import {
  CreatePaymentTransferQuoteBodySourceType,
  CreatePaymentTransferQuoteBodyTargetType,
  type CdpOpenApiClientType,
} from "../../../openapi-client/index.js";
import { BaseFundOptions, FundOperationResult } from "../../types.js";

/**
 * Options for funding a Solana account.
 */
export interface SolanaFundOptions extends BaseFundOptions {
  /** The token to request funds for. */
  token: "sol" | "usdc";
}

/**
 * Funds a Solana account.
 *
 * @deprecated This method will be removed in a future version. Consider using our Onramp API instead. See https://docs.cdp.coinbase.com/api-reference/v2/rest-api/onramp/create-an-onramp-order.
 * @param apiClient - The API client.
 * @param options - The options for funding a Solana account.
 *
 * @returns A promise that resolves to the fund operation result.
 */
export async function fund(
  apiClient: CdpOpenApiClientType,
  options: SolanaFundOptions,
): Promise<FundOperationResult> {
  if (options.token !== "sol" && options.token !== "usdc") {
    throw new UserInputValidationError("Invalid token, must be sol or usdc");
  }

  const decimals = options.token === "sol" ? 9 : 6;
  const amount = formatUnits(options.amount, decimals);

  const paymentMethods = await apiClient.getPaymentMethods();
  const cardPaymentMethod = paymentMethods.find(
    method => method.type === "card" && method.actions.includes("source"),
  );

  if (!cardPaymentMethod) {
    throw new Error("No card found to fund account");
  }

  const response = await apiClient.createPaymentTransferQuote({
    sourceType: CreatePaymentTransferQuoteBodySourceType.payment_method,
    source: {
      id: cardPaymentMethod.id,
    },
    targetType: CreatePaymentTransferQuoteBodyTargetType.crypto_rail,
    target: {
      currency: options.token,
      network: "solana",
      address: options.address,
    },
    amount,
    currency: options.token,
    execute: true,
  });

  return {
    id: response.transfer.id,
    network: response.transfer.target.network,
    status: response.transfer.status,
    targetAmount: response.transfer.targetAmount,
    targetCurrency: response.transfer.targetCurrency,
    transactionHash: response.transfer.transactionHash,
  };
}
