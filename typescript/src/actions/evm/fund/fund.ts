import { formatUnits } from "viem";

import { FundOperationResult } from "./types.js";
import {
  CreatePaymentTransferQuoteBodySourceType,
  CreatePaymentTransferQuoteBodyTargetType,
  type CdpOpenApiClientType,
} from "../../../openapi-client/index.js";

/**
 * Options for funding an EVM account.
 */
export interface FundOptions {
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
 * Funds an EVM account.
 *
 * @param apiClient - The API client.
 * @param options - The options for funding an EVM account.
 *
 * @returns A promise that resolves to the fund operation result.
 */
export async function fund(
  apiClient: CdpOpenApiClientType,
  options: FundOptions,
): Promise<FundOperationResult> {
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
