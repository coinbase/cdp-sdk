/*
 * Client-side pre-flight balance check.
 *
 * Wires a BeforePaymentCreationHook that queries the configured CDP wallet's
 * token balance for the requested asset/network and fails fast with a clear
 * InsufficientFundsError when the balance is below the amount the server is
 * asking for. Balance lookup is best-effort and silently skipped on unsupported
 * networks, missing tokens, or API failures.
 */
import { createPublicClient, http } from "viem";

import {
  CDP_EVM_RPC_URLS,
  baseMainnetCaip2,
  baseSepoliaCaip2,
  solanaDevnetCaip2,
  solanaMainnetCaip2,
} from "./constants.js";

import type { CdpClient } from "../client/cdp.js";
import type { BeforePaymentCreationHook } from "@x402/core/client";
import type { PaymentRequirements } from "@x402/core/types";

/** CAIP-2 → CDP indexed balance API network slug for CDP-supported EVM networks. */
const CAIP_TO_CDP_EVM_BALANCE_NETWORK: Record<string, "base" | "base-sepolia"> = {
  [baseMainnetCaip2]: "base",
  [baseSepoliaCaip2]: "base-sepolia",
};

/** Minimal ERC-20 ABI fragment for `balanceOf`. */
const ERC20_BALANCE_OF_ABI = [
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

/** CAIP-2 → CDP Solana balance API network. */
const CAIP_TO_CDP_SVM_BALANCE_NETWORK: Record<string, "solana" | "solana-devnet"> = {
  [solanaMainnetCaip2]: "solana",
  [solanaDevnetCaip2]: "solana-devnet",
};

/**
 * Thrown when the configured wallet's balance is below the amount required by
 * the server's `PaymentRequirements`.
 */
export class InsufficientFundsError extends Error {
  readonly code = "insufficient_funds" as const;
  readonly required: bigint;
  readonly available: bigint;
  readonly asset: string;
  readonly network: string;
  readonly address: string;

  /**
   * Constructs an InsufficientFundsError.
   *
   * @param params - Error context.
   * @param params.required - Required amount in atomic units.
   * @param params.available - Available amount in atomic units.
   * @param params.asset - Asset identifier (contract address or mint).
   * @param params.network - CAIP-2 network identifier.
   * @param params.address - Wallet address being checked.
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
  }
}

interface BalanceCheckOptions {
  cdpClient: CdpClient;
  evmAddress: `0x${string}`;
  svmAddress: string;
  /**
   * Optional warning sink for skipped-check diagnostics. Defaults to
   * `console.warn`. Pass a no-op to silence completely.
   */
  onWarning?: (message: string, cause?: unknown) => void;
  /**
   * Override the public JSON-RPC endpoints used for on-chain balance lookups,
   * keyed by CAIP-2 network identifier. Merged over the built-in
   * `CDP_EVM_RPC_URLS` defaults.
   */
  rpcUrls?: Partial<Record<string, { rpcUrl: string }>>;
}

const defaultWarning = (message: string, cause?: unknown): void => {
  if (cause === undefined)
    // eslint-disable-next-line no-console
    console.warn(`[@coinbase/cdp-sdk/x402] ${message}`);
  // eslint-disable-next-line no-console
  else console.warn(`[@coinbase/cdp-sdk/x402] ${message}`, cause);
};

/**
 * Parses the atomic amount from a payment requirements object.
 *
 * Handles both v1 (`maxAmountRequired`) and v2+ (`amount`) wire formats.
 * Returns `undefined` when the field is absent or not parseable as a BigInt.
 *
 * @param req - Payment requirements from the server.
 * @returns The required amount in atomic units, or `undefined` if unparseable.
 */
function tryParseAtomicFromRequirement(req: PaymentRequirements): bigint | undefined {
  const raw =
    "amount" in req && req.amount !== undefined
      ? req.amount
      : (req as unknown as { maxAmountRequired?: string }).maxAmountRequired;
  if (raw === undefined || raw === null) return undefined;
  try {
    const parsed = BigInt(raw as string);
    return parsed < 0n ? undefined : parsed;
  } catch {
    return undefined;
  }
}

/**
 * Normalizes an EVM asset identifier for comparisons.
 * EVM contract addresses (`0x` + 40 hex chars) are lower-cased.
 *
 * @param asset - Raw asset identifier string.
 * @returns Lower-cased EVM address, or the original string for non-EVM assets.
 */
function normalizeAsset(asset: string): string {
  const trimmed = asset.trim();
  if (/^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return trimmed;
}

/**
 * Builds a `BeforePaymentCreationHook` that performs a pre-flight balance check
 * against the configured CDP wallet.
 *
 * The hook is intentionally lenient: any condition under which the check
 * cannot be performed (unsupported network, missing token, API error) is
 * treated as a pass so we never block legitimate payments on pre-check noise.
 *
 * @param opts - Options including CDP client, wallet addresses, and RPC overrides.
 * @returns A hook that throws `InsufficientFundsError` when the balance is too low.
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

/**
 * Reads the ERC-20 `balanceOf` for `walletAddress` directly on-chain via the
 * supplied public JSON-RPC endpoint. Used for EVM networks not covered by the
 * CDP indexed token-balance API.
 *
 * @param rpcUrl - Public JSON-RPC URL for the target network.
 * @param contractAddress - ERC-20 contract address to query.
 * @param walletAddress - Wallet address to check balance for.
 * @returns The balance in atomic (wei) units.
 */
async function readOnChainErc20Balance(
  rpcUrl: string,
  contractAddress: `0x${string}`,
  walletAddress: `0x${string}`,
): Promise<bigint> {
  const client = createPublicClient({ transport: http(rpcUrl) });
  return client.readContract({
    address: contractAddress,
    abi: ERC20_BALANCE_OF_ABI,
    functionName: "balanceOf",
    args: [walletAddress],
  });
}

/**
 * Returns the balance (in atomic units) of `params.asset` held by
 * `params.address` on the CDP indexed balance API, or `0n` when absent.
 *
 * @param cdpClient - Configured CDP client.
 * @param params - Query parameters.
 * @param params.address - EVM wallet address.
 * @param params.network - CDP network slug (`"base"` or `"base-sepolia"`).
 * @param params.asset - Normalized ERC-20 contract address.
 * @returns Balance in atomic units, or `0n` if the asset is not found.
 */
async function getEvmBalance(
  cdpClient: CdpClient,
  params: { address: `0x${string}`; network: "base" | "base-sepolia"; asset: string },
): Promise<bigint> {
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
}

/**
 * Returns the balance (in atomic units) of `params.asset` held by
 * `params.address` on Solana, or `0n` when absent.
 *
 * @param cdpClient - Configured CDP client.
 * @param params - Query parameters.
 * @param params.address - Solana wallet address.
 * @param params.network - CDP Solana network slug.
 * @param params.asset - SPL token mint address.
 * @returns Balance in atomic units, or `0n` if the asset is not found.
 */
async function getSvmBalance(
  cdpClient: CdpClient,
  params: { address: string; network: "solana" | "solana-devnet"; asset: string },
): Promise<bigint> {
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
}
