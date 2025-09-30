import { formatUnits } from "viem";

import { UserInputValidationError } from "../../../errors.js";
import {
  CreatePaymentTransferQuoteBodySourceType,
  CreatePaymentTransferQuoteBodyTargetType,
  type CdpOpenApiClientType,
} from "../../../openapi-client/index.js";
import { EvmQuote } from "../../Quote.js";
import { BaseQuoteFundOptions } from "../../types.js";

/**
 * Options for getting a quote to fund an EVM account.
 */
export interface EvmQuoteFundOptions extends BaseQuoteFundOptions {
  /** The network to request funds from. */
  network: "base" | "ethereum";
  /** The token to request funds for. */
  token: "eth" | "usdc";
}

/**
 * Gets a quote to fund an EVM account.
 *
 * @deprecated This method will be removed in a future version. Consider using our Onramp API instead. See https://docs.cdp.coinbase.com/api-reference/v2/rest-api/onramp/create-an-onramp-order.
 * @param apiClient - The API client.
 * @param options - The options for getting a quote to fund an EVM account.
 *
 * @returns A promise that resolves to the quote.
 */
export async function quoteFund(
  apiClient: CdpOpenApiClientType,
  options: EvmQuoteFundOptions,
): Promise<EvmQuote> {
  if (options.token !== "eth" && options.token !== "usdc") {
    throw new UserInputValidationError("Invalid token, must be eth or usdc");
  }

  const decimals = options.token === "eth" ? 18 : 6;
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
      network: options.network,
      address: options.address,
    },
    amount,
    currency: options.token,
  });

  return new EvmQuote(
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
