import { formatUnits } from "viem";

import { UserInputValidationError } from "../../../errors.js";
import {
  CdpOpenApiClientType,
  CreatePaymentTransferQuoteBodySourceType,
  CreatePaymentTransferQuoteBodyTargetType,
} from "../../../openapi-client/index.js";
import { SolanaQuote } from "../../Quote.js";
import { BaseQuoteFundOptions } from "../../types.js";

/**
 * Options for getting a quote to fund a Solana account.
 */
export interface SolanaQuoteFundOptions extends BaseQuoteFundOptions {
  /** The token to request funds for. */
  token: "sol" | "usdc";
}

/**
 * Gets a quote to fund a Solana account.
 *
 * @deprecated This method will be removed in a future version. Consider using our Onramp API instead. See https://docs.cdp.coinbase.com/api-reference/v2/rest-api/onramp/create-an-onramp-order.
 * @param apiClient - The API client.
 * @param options - The options for getting a quote to fund a Solana account.
 *
 * @returns A promise that resolves to the quote.
 */
export async function quoteFund(
  apiClient: CdpOpenApiClientType,
  options: SolanaQuoteFundOptions,
): Promise<SolanaQuote> {
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
  });

  return new SolanaQuote(
    apiClient,
    response.transfer.id,
    "solana",
    response.transfer.sourceAmount,
    response.transfer.sourceCurrency,
    response.transfer.targetAmount,
    response.transfer.targetCurrency,
    response.transfer.fees.map(fee => ({
      type: fee.type,
      amount: fee.amount,
      currency: fee.currency,
    })),
  );
}
