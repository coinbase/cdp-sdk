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
import type { Network, PaymentPayload, PaymentRequired } from "@x402/core/types";

/**
 * Options for signing an x402 payment payload.
 */
export interface SignX402PaymentOptions {
  /** The x402 payment requirements returned by a resource server. */
  paymentRequired: PaymentRequired;
  /**
   * Optional index into `paymentRequired.accepts` selecting which requirement
   * to sign. When omitted, signing uses the first network-compatible entry for
   * the account type (EVM or Solana).
   */
  acceptedIndex?: number;
}

type RpcUrlsByCaip2 = Record<string, { rpcUrl: string }>;
type PaymentRequirementMatcher = (accept: PaymentRequired["accepts"][number]) => boolean;

/**
 * Parses JSON from CDP_X402_RPC_URLS and converts it into CAIP-2 keyed RPC config.
 *
 * Supports either of these value formats:
 * - { "eip155:8453": "https://..." }
 * - { "eip155:8453": { "rpcUrl": "https://..." } }
 *
 * @returns Parsed CAIP-2 keyed EVM/Solana RPC URL overrides.
 */
function parseRpcUrlsFromEnv(): RpcUrlsByCaip2 {
  const raw = process.env.CDP_X402_RPC_URLS;
  if (!raw) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      "Invalid CDP_X402_RPC_URLS: expected JSON object mapping CAIP-2 network IDs to RPC URL strings.",
    );
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(
      "Invalid CDP_X402_RPC_URLS: expected JSON object mapping CAIP-2 network IDs to RPC URL strings.",
    );
  }

  const rpcUrlsByCaip2: RpcUrlsByCaip2 = {};
  for (const [network, value] of Object.entries(parsed)) {
    if (typeof value === "string") {
      rpcUrlsByCaip2[network] = { rpcUrl: value };
      continue;
    }

    if (value && typeof value === "object" && "rpcUrl" in value) {
      const rpcUrl = (value as { rpcUrl?: unknown }).rpcUrl;
      if (typeof rpcUrl === "string") {
        rpcUrlsByCaip2[network] = { rpcUrl };
        continue;
      }
    }

    throw new Error(
      `Invalid CDP_X402_RPC_URLS entry for "${network}": expected string URL or { rpcUrl: string }.`,
    );
  }

  return rpcUrlsByCaip2;
}

/**
 * Resolves the final CAIP-2 keyed EVM RPC configuration used for x402 signing.
 *
 * Defaults come from CDP_EVM_RPC_URLS, with CDP_X402_RPC_URLS env values taking precedence.
 *
 * @returns CAIP-2 keyed RPC configuration map.
 */
function resolveEvmRpcUrlsByCaip2(): RpcUrlsByCaip2 {
  return {
    ...CDP_EVM_RPC_URLS,
    ...parseRpcUrlsFromEnv(),
  };
}

/**
 * Converts CAIP-2 keyed RPC config to the numeric-chain-ID map expected by
 * Exact/Upto EVM schemes.
 *
 * @param rpcUrlsByCaip2 - CAIP-2 keyed RPC configuration map.
 * @returns Record of numeric EIP-155 chain IDs to RPC URL objects.
 */
function buildEvmRpcUrlsByChainId(
  rpcUrlsByCaip2: RpcUrlsByCaip2,
): Record<number, { rpcUrl: string }> {
  const result: Record<number, { rpcUrl: string }> = {};
  for (const [caip2, cfg] of Object.entries(rpcUrlsByCaip2)) {
    const [namespace, chainId] = caip2.split(":");
    if (namespace !== "eip155" || !chainId) continue;
    const numericChainId = Number(chainId);
    if (!Number.isNaN(numericChainId)) {
      result[numericChainId] = cfg;
    }
  }
  return result;
}

/**
 * Selects a payment requirement by original `paymentRequired.accepts` index and
 * returns a normalized PaymentRequired containing only that entry.
 *
 * This preserves the documented semantics of `acceptedIndex` even though
 * `x402Client` internally filters accepts by registered scheme/network before
 * invoking selectors.
 *
 * @param paymentRequired - Original payment requirements from a resource server.
 * @param acceptedIndex - Index into the original `paymentRequired.accepts`.
 * @param options - Optional compatibility matcher used when no acceptedIndex is provided.
 * @param options.matcher - Determines whether a payment requirement is compatible with the account type.
 * @param options.compatibilityDescription - Human-readable compatibility label for error messages.
 * @returns A PaymentRequired with exactly one accepted requirement.
 */
function selectAcceptedPaymentRequired(
  paymentRequired: PaymentRequired,
  acceptedIndex: number | undefined,
  options?: {
    matcher?: PaymentRequirementMatcher;
    compatibilityDescription?: string;
  },
): PaymentRequired {
  if (acceptedIndex === undefined && options?.matcher) {
    const selected = paymentRequired.accepts.find(options.matcher);
    if (!selected) {
      throw new Error(
        `No ${options.compatibilityDescription ?? "compatible"} payment requirement found in paymentRequired.accepts.`,
      );
    }
    return {
      ...paymentRequired,
      accepts: [selected],
    };
  }

  const idx = acceptedIndex ?? 0;
  const selected = paymentRequired.accepts[idx];
  if (!selected) {
    throw new Error(
      `acceptedIndex ${idx} is out of range — paymentRequired.accepts has ` +
        `${paymentRequired.accepts.length} entr${paymentRequired.accepts.length === 1 ? "y" : "ies"}.`,
    );
  }
  return {
    ...paymentRequired,
    accepts: [selected],
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
  const rpcUrlsByChainId = buildEvmRpcUrlsByChainId(resolveEvmRpcUrlsByCaip2());
  const selectedPaymentRequired = selectAcceptedPaymentRequired(
    options.paymentRequired,
    options.acceptedIndex,
    {
      matcher: accept => accept.network.startsWith("eip155:"),
      compatibilityDescription: "EVM",
    },
  );
  const signer = fromCdpEvmAccount(account);
  const client = new x402Client();
  registerExactEvmScheme(client, { signer, schemeOptions: rpcUrlsByChainId });
  client.register("eip155:*" as Network, new UptoEvmScheme(signer, rpcUrlsByChainId));
  return client.createPaymentPayload(selectedPaymentRequired);
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
  const rpcUrlsByChainId = buildEvmRpcUrlsByChainId(resolveEvmRpcUrlsByCaip2());
  const selectedPaymentRequired = selectAcceptedPaymentRequired(
    options.paymentRequired,
    options.acceptedIndex,
    {
      matcher: accept => accept.network.startsWith("eip155:"),
      compatibilityDescription: "EVM",
    },
  );
  const signer = fromCdpSmartWallet(account);
  const client = new x402Client();
  registerExactEvmScheme(client, { signer, schemeOptions: rpcUrlsByChainId });
  client.register("eip155:*" as Network, new UptoEvmScheme(signer, rpcUrlsByChainId));
  return client.createPaymentPayload(selectedPaymentRequired);
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
  const selectedPaymentRequired = selectAcceptedPaymentRequired(
    options.paymentRequired,
    options.acceptedIndex,
    {
      matcher: accept => accept.network.startsWith("solana:"),
      compatibilityDescription: "Solana",
    },
  );
  const signer = cdpSolanaAccountToSvmSigner(account);
  const client = new x402Client();
  registerExactSvmScheme(client, { signer });
  return client.createPaymentPayload(selectedPaymentRequired);
}
