/*
 * Client-side pre-flight balance check.
 *
 * Wires a BeforePaymentCreationHook that queries the CDP wallet's token
 * balance and fails fast with InsufficientFundsError when the balance is
 * below the required amount. The check is best-effort and silently skipped
 * for unsupported networks or on API errors.
 */
import { createPublicClient, http } from "viem";

import {
  CDP_EVM_RPC_URLS,
  baseMainnetCaip2,
  baseSepoliaCaip2,
  solanaDevnetCaip2,
  solanaMainnetCaip2,
} from "./constants.js";
import { tryParseAtomicFromRequirement } from "./guardrails/apply.js";
import { normalizeAsset } from "./guardrails/normalize.js";

import type { CdpClient } from "../client/cdp.js";
import type { BeforePaymentCreationHook } from "@x402/core/client";

const CAIP_TO_CDP_EVM_BALANCE_NETWORK: Record<string, "base" | "base-sepolia"> = {
  [baseMainnetCaip2]: "base",
  [baseSepoliaCaip2]: "base-sepolia",
};

const ERC20_BALANCE_OF_ABI = [
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

const CAIP_TO_CDP_SVM_BALANCE_NETWORK: Record<string, "solana" | "solana-devnet"> = {
  [solanaMainnetCaip2]: "solana",
  [solanaDevnetCaip2]: "solana-devnet",
};

/**
 * Thrown when the configured wallet's balance is below the amount required by
 * the server's `PaymentRequirements`.
 */
export class InsufficientFundsError extends Error {
  /** - Machine-readable error code. */
  readonly code = "insufficient_funds" as const;

  /** - Required amount in atomic units. */
  readonly required: bigint;

  /** - Available balance in atomic units. */
  readonly available: bigint;

  /** - Asset identifier. */
  readonly asset: string;

  /** - CAIP-2 network identifier. */
  readonly network: string;

  /** - Wallet address that was checked. */
  readonly address: string;

  /**
   * Creates an InsufficientFundsError with the given parameters.
   *
   * @param params - Error parameters.
   * @param params.required - Required amount in atomic units.
   * @param params.available - Available balance in atomic units.
   * @param params.asset - Asset identifier.
   * @param params.network - CAIP-2 network identifier.
   * @param params.address - Wallet address.
   */
  constructor(params: {
    required: bigint;
    available: bigint;
    asset: string;
    network: string;
    address: string;
  }) {
    super(
      `Insufficient funds for x402 payment: wallet ${params.address} on ${params.network} has ` +
        `${params.available} of asset ${params.asset}, but ${params.required} is required.`,
    );
    this.name = "InsufficientFundsError";
    this.required = params.required;
    this.available = params.available;
    this.asset = params.asset;
    this.network = params.network;
    this.address = params.address;
    Object.setPrototypeOf(this, InsufficientFundsError.prototype);
  }
}

interface BalanceCheckOptions {
  cdpClient: CdpClient;
  evmAddress: `0x${string}`;
  svmAddress: string;
  rpcUrls?: Partial<Record<string, { rpcUrl: string }>>;
  onWarning?: (message: string, cause?: unknown) => void;
}

const defaultWarning = (message: string, cause?: unknown): void => {
  if (cause === undefined)
    // eslint-disable-next-line no-console
    console.warn(`[@coinbase/cdp-sdk/x402] ${message}`);
  // eslint-disable-next-line no-console
  else console.warn(`[@coinbase/cdp-sdk/x402] ${message}`, cause);
};

const readOnChainErc20Balance = async (
  rpcUrl: string,
  contractAddress: `0x${string}`,
  walletAddress: `0x${string}`,
): Promise<bigint> => {
  const client = createPublicClient({ transport: http(rpcUrl) });
  return client.readContract({
    address: contractAddress,
    abi: ERC20_BALANCE_OF_ABI,
    functionName: "balanceOf",
    args: [walletAddress],
  });
};

const getEvmBalance = async (
  cdpClient: CdpClient,
  params: { address: `0x${string}`; network: "base" | "base-sepolia"; asset: string },
): Promise<bigint> => {
  let pageToken: string | undefined;
  do {
    const page = await cdpClient.evm.listTokenBalances({
      address: params.address,
      network: params.network,
      pageToken,
    });
    for (const entry of page.balances) {
      if (normalizeAsset(entry.token.contractAddress) === params.asset) {
        return entry.amount.amount;
      }
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
  return 0n;
};

const getSvmBalance = async (
  cdpClient: CdpClient,
  params: { address: string; network: "solana" | "solana-devnet"; asset: string },
): Promise<bigint> => {
  let pageToken: string | undefined;
  do {
    const page = await cdpClient.solana.listTokenBalances({
      address: params.address,
      network: params.network,
      pageToken,
    });
    for (const entry of page.balances) {
      if (entry.token.mintAddress === params.asset) {
        return entry.amount.amount;
      }
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
  return 0n;
};

/**
 * Builds a `BeforePaymentCreationHook` that performs a pre-flight balance
 * check against the configured CDP wallet.
 *
 * The hook is intentionally lenient: any condition under which the check
 * cannot be performed is treated as a pass so legitimate payments are never
 * blocked on pre-check noise.
 *
 * @param opts - Balance check configuration including the CDP client and wallet addresses.
 * @returns A BeforePaymentCreationHook that validates wallet balance before each payment.
 */
export function createBalanceCheckHook(opts: BalanceCheckOptions): BeforePaymentCreationHook {
  const { cdpClient, evmAddress, svmAddress } = opts;
  const warn = opts.onWarning ?? defaultWarning;
  const rpcUrls: Record<string, { rpcUrl: string }> = opts.rpcUrls
    ? ({ ...CDP_EVM_RPC_URLS, ...opts.rpcUrls } as Record<string, { rpcUrl: string }>)
    : CDP_EVM_RPC_URLS;

  return async context => {
    const req = context.selectedRequirements;
    const required = tryParseAtomicFromRequirement(req);
    if (required === undefined) return undefined;
    if (required === 0n) return undefined;

    const normalizedAsset = normalizeAsset(req.asset);

    const evmNetwork = CAIP_TO_CDP_EVM_BALANCE_NETWORK[req.network];
    const evmRpcUrl = rpcUrls[req.network]?.rpcUrl;
    const svmNetwork = CAIP_TO_CDP_SVM_BALANCE_NETWORK[req.network];

    let available: bigint;
    let address: string;

    const assetLabel = svmNetwork ? req.asset : normalizedAsset;

    try {
      if (evmNetwork) {
        address = evmAddress;
        available = await getEvmBalance(cdpClient, {
          address: evmAddress,
          network: evmNetwork,
          asset: normalizedAsset,
        });
      } else if (evmRpcUrl) {
        if (!normalizedAsset.startsWith("0x")) return undefined;
        address = evmAddress;
        available = await readOnChainErc20Balance(
          evmRpcUrl,
          normalizedAsset as `0x${string}`,
          evmAddress,
        );
      } else if (svmNetwork) {
        address = svmAddress;
        available = await getSvmBalance(cdpClient, {
          address: svmAddress,
          network: svmNetwork,
          asset: req.asset,
        });
      } else {
        return undefined;
      }
    } catch (error) {
      warn(
        `Pre-flight balance check failed for ${req.network} (${assetLabel}); ` +
          "proceeding without check.",
        error,
      );
      return undefined;
    }

    if (available >= required) return undefined;

    throw new InsufficientFundsError({
      required,
      available,
      asset: req.asset,
      network: req.network,
      address,
    });
  };
}
