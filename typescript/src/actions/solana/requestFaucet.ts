import { RequestFaucetOptions, SignatureResult } from "../../client/solana/solana.types.js";
import { CdpOpenApiClientType } from "../../openapi-client/index.js";

/**
 * Requests funds from a Solana faucet.
 *
 * @param apiClient - The API client.
 * @param {RequestFaucetOptions} options - Parameters for requesting funds from the Solana faucet.
 * @param {string} options.address - The address to request funds for.
 * @param {string} options.token - The token to request funds for.
 * @param {string} [options.idempotencyKey] - An idempotency key.
 *
 * @returns A promise that resolves to the transaction signature.
 *
 * @example
 *          ```ts
 *          const signature = await requestFaucet(cdp.solana, {
 *            address: "1234567890123456789012345678901234567890",
 *            token: "sol",
 *          });
 *          ```
 */
export async function requestFaucet(
  apiClient: CdpOpenApiClientType,
  options: RequestFaucetOptions,
): Promise<SignatureResult> {
  const signature = await apiClient.requestSolanaFaucet(
    { address: options.address, token: options.token },
    options.idempotencyKey,
  );

  return {
    signature: signature.transactionSignature,
  };
}
