import { formatUnits } from "viem";

import { Quote } from "./Quote.js";
import {
  CreatePaymentTransferQuoteBodySourceType,
  CreatePaymentTransferQuoteBodyTargetType,
  type CdpOpenApiClientType,
} from "../../../openapi-client/index.js";

/**
 * Options for getting a quote to fund an EVM account.
 */
export interface QuoteFundOptions {
  /** The address of the account. */
  address: string;
  /** The network to request funds from. */
  network: "base";
  /** The amount to fund the account with, in atomic units (wei) of the token. */
  amount: bigint;
  /** The token to request funds for. */
  token: "eth" | "usdc";
}

/**
 * Gets a quote to fund an EVM account.
 *
 * @param apiClient - The API client.
 * @param options - The options for getting a quote to fund an EVM account.
 *
 * @returns A promise that resolves to the quote.
 */
export async function quoteFund(
  apiClient: CdpOpenApiClientType,
  options: QuoteFundOptions,
): Promise<Quote> {
  const paymentMethods = await apiClient.getPaymentMethods();
  const cardPaymentMethod = paymentMethods.find(
    method => method.type === "card" && method.actions.includes("source"),
  );

  if (!cardPaymentMethod) {
    throw new Error("No card found to fund account");
  }

  if (options.token.toLowerCase() !== "eth" && options.token.toLowerCase() !== "usdc") {
    throw new Error("Invalid currency, must be eth or usdc");
  }

  const decimals = options.token === "eth" ? 18 : 6;
  const amount = formatUnits(options.amount, decimals);

  const response = await apiClient.createPaymentTransferQuote({
    sourceType: CreatePaymentTransferQuoteBodySourceType.payment_method,
    source: {
      id: cardPaymentMethod.id,
    },
    targetType: CreatePaymentTransferQuoteBodyTargetType.crypto_rail,
    target: {
      currency: options.token,
      network: options.network,
      address: options.address,
    },
    amount,
    currency: options.token,
  });

  return new Quote(
    apiClient,
    response.transfer.id,
    options.network,
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
