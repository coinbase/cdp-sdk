/*
 * Account-level x402 payment signing.
 *
 * Signs x402 payment payloads locally using the x402 SDK — no CDP signing
 * API endpoint required. Importable from deep inside the account factory chain
 * without creating a circular dependency because this module imports only from
 * x402/account-signers.ts (no CdpClient).
 */
import { x402Client } from "@x402/core/client";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { UptoEvmScheme } from "@x402/evm/upto/client";
import { registerExactSvmScheme } from "@x402/svm/exact/client";

import {
  fromCdpEvmAccount,
  fromCdpSmartWallet,
  cdpSolanaAccountToSvmSigner,
} from "../../x402/account-signers.js";
import { CDP_EVM_RPC_URLS } from "../../x402/constants.js";

import type {
  CdpEvmAccount,
  CdpSmartAccount,
  CdpSolanaAccount,
} from "../../x402/account-signers.js";
import type {
  Network,
  PaymentPayload,
  PaymentRequired,
  PaymentRequirements,
} from "@x402/core/types";

/**
 * Options for signing an x402 payment payload.
 */
export interface SignX402PaymentOptions {
  /** The x402 payment requirements returned by a resource server. */
  paymentRequired: PaymentRequired;
  /**
   * Optional index into `paymentRequired.accepts` selecting which requirements
   * to sign. Defaults to `0` (the first entry).
   */
  acceptedIndex?: number;
}

/**
 * Converts CDP_EVM_RPC_URLS (CAIP-2 keys) to the numeric-chain-ID map that UptoEvmScheme expects.
 *
 * @returns Record of numeric EIP-155 chain IDs to RPC URL objects.
 */
function buildUptoRpcUrls(): Record<number, { rpcUrl: string }> {
  const result: Record<number, { rpcUrl: string }> = {};
  for (const [caip2, cfg] of Object.entries(CDP_EVM_RPC_URLS)) {
    const [namespace, chainId] = caip2.split(":");
    if (namespace === "eip155" && chainId) result[Number(chainId)] = cfg;
  }
  return result;
}

/**
 * Returns an x402Client payment-requirements selector that picks by index.
 *
 * @param acceptedIndex - Index into the `accepts` array. Defaults to `0`.
 * @returns A selector function for `x402Client`.
 */
function makeSelector(
  acceptedIndex: number | undefined,
): (x402Version: number, accepts: PaymentRequirements[]) => PaymentRequirements {
  return (_version, accepts) => {
    const idx = acceptedIndex ?? 0;
    const req = accepts[idx];
    if (!req) {
      throw new Error(
        `acceptedIndex ${idx} is out of range — paymentRequired.accepts has ` +
          `${accepts.length} entr${accepts.length === 1 ? "y" : "ies"}.`,
      );
    }
    return req;
  };
}

/**
 * Signs an x402 payment payload with an EVM server account (EOA).
 *
 * Registers the exact and upto EVM schemes locally using the x402 SDK, then
 * calls `x402Client.createPaymentPayload`. No CDP signing endpoint is used.
 *
 * @param account - The CDP EVM server account.
 * @param options - The x402 payment requirements and optional accepted index.
 * @returns The signed x402 payment payload.
 */
export async function signEvmX402Payment(
  account: CdpEvmAccount,
  options: SignX402PaymentOptions,
): Promise<PaymentPayload> {
  const signer = fromCdpEvmAccount(account);
  const client = new x402Client(makeSelector(options.acceptedIndex));
  registerExactEvmScheme(client, { signer });
  client.register("eip155:*" as Network, new UptoEvmScheme(signer, buildUptoRpcUrls()));
  return client.createPaymentPayload(options.paymentRequired);
}

/**
 * Signs an x402 payment payload with an EVM smart account.
 *
 * The smart-account adapter derives the CDP network from the EIP-712 domain's
 * `chainId`, so no explicit network parameter is needed on the call site.
 *
 * @param account - The CDP EVM smart account.
 * @param options - The x402 payment requirements and optional accepted index.
 * @returns The signed x402 payment payload.
 */
export async function signEvmSmartAccountX402Payment(
  account: CdpSmartAccount,
  options: SignX402PaymentOptions,
): Promise<PaymentPayload> {
  const signer = fromCdpSmartWallet(account);
  const client = new x402Client(makeSelector(options.acceptedIndex));
  registerExactEvmScheme(client, { signer });
  client.register("eip155:*" as Network, new UptoEvmScheme(signer, buildUptoRpcUrls()));
  return client.createPaymentPayload(options.paymentRequired);
}

/**
 * Signs an x402 payment payload with a Solana account.
 *
 * @param account - The CDP Solana account.
 * @param options - The x402 payment requirements and optional accepted index.
 * @returns The signed x402 payment payload.
 */
export async function signSolanaX402Payment(
  account: CdpSolanaAccount,
  options: SignX402PaymentOptions,
): Promise<PaymentPayload> {
  const signer = cdpSolanaAccountToSvmSigner(account);
  const client = new x402Client(makeSelector(options.acceptedIndex));
  registerExactSvmScheme(client, { signer });
  return client.createPaymentPayload(options.paymentRequired);
}
