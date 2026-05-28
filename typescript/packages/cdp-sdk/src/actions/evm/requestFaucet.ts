import { type CdpOpenApiClientType } from "../../openapi-client/index.js";
import { Hex } from "../../types/misc.js";

/**
 * Options for requesting funds from an EVM faucet.
 */
export interface RequestFaucetOptions {
  /** The address of the account. */
  address: string;
  /** The network to request funds from. */
  network: "base-sepolia" | "ethereum-sepolia";
  /** The token to request funds for. */
  token: "eth" | "usdc" | "eurc" | "cbbtc";
  /** The idempotency key. */
  idempotencyKey?: string;
}

/**
 * The result of requesting funds from an EVM faucet.
 */
export interface RequestFaucetResult {
  /** The transaction hash. */
  transactionHash: Hex;
}

/**
 * Requests funds from an EVM faucet.
 *
 * @param apiClient - The API client.
 * @param options - The options for requesting funds from the EVM faucet.
 *
 * @returns A promise that resolves to the transaction hash.
 */
export async function requestFaucet(
  apiClient: CdpOpenApiClientType,
  options: RequestFaucetOptions,
) {
  const { transactionHash } = await apiClient.requestEvmFaucet(
    { address: options.address, network: options.network, token: options.token },
    options.idempotencyKey,
  );

  return {
    transactionHash: transactionHash as Hex,
  };
}
