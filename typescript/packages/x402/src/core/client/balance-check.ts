/**
 * Client-side pre-flight balance check.
 *
 * Wires a `BeforePaymentCreationHook` that queries the configured CDP wallet's
 * token balance for the requested asset/network and fails fast with a clear
 * {@link InsufficientFundsError} when the balance is below the amount the
 * server is asking for.
 *
 * Without this check, an unfunded wallet submits a signed payment that the
 * facilitator/verifier then rejects with a generic
 * `invalidReason: invalid_payload` + `execution reverted` message, which is
 * not actionable. This pre-check converts that into a typed error before any
 * signing occurs.
 *
 * Balance lookup is best-effort and is silently skipped when:
 * - the requested network is not supported.
 *   EVM coverage: `base` and `base-sepolia` use the CDP indexed token-balance
 *   API; `polygon`, `arbitrum`, `world`, and `world-sepolia` fall back to a
 *   direct on-chain `balanceOf` call via the public RPC endpoint from
 *   {@link CDP_EVM_RPC_URLS}. SVM coverage is `solana` and `solana-devnet`.
 * - the requested asset contract / mint is not present in the returned token
 *   balances (e.g. brand-new ERC-20 the CDP indexer hasn't seen yet), or
 * - the balance call itself fails (network blip, auth issue) — the original
 *   downstream error path is preserved.
 *
 * @packageDocumentation
 */
import type { CdpClient } from "@coinbase/cdp-sdk";
import type { BeforePaymentCreationHook } from "@x402/core/client";
import { createPublicClient, http } from "viem";

import {
  CDP_EVM_RPC_URLS,
  baseMainnetCaip2,
  baseSepoliaCaip2,
  solanaDevnetCaip2,
  solanaMainnetCaip2,
} from "../facilitator/constants.js";
import { tryParseAtomicFromRequirement } from "../guardrails/apply.js";
import { normalizeAsset } from "../guardrails/normalize.js";

/**
 * CAIP-2 → CDP indexed balance API network slug for CDP supported EVM networks.
 */
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

/**
 * CAIP-2 → CDP Solana balance API network.
 */
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
   * `CDP_EVM_RPC_URLS` defaults — only supply the networks you want to
   * override.
   */
  rpcUrls?: Partial<Record<string, { rpcUrl: string }>>;
}

const defaultWarning = (message: string, cause?: unknown): void => {
  if (cause === undefined) console.warn(`[@coinbase/x402] ${message}`);
  else console.warn(`[@coinbase/x402] ${message}`, cause);
};

/**
 * Builds a `BeforePaymentCreationHook` that performs a pre-flight balance check
 * against the configured CDP wallet.
 *
 * The hook is intentionally lenient: any condition under which the check
 * cannot be performed (unsupported network, missing token in balances, API
 * error) is treated as a pass so we never block legitimate payments on
 * pre-check noise.
 */
export function createBalanceCheckHook(opts: BalanceCheckOptions): BeforePaymentCreationHook {
  const { cdpClient, evmAddress, svmAddress } = opts;
  const warn = opts.onWarning ?? defaultWarning;
  const rpcUrls: Record<string, { rpcUrl: string }> = opts.rpcUrls
    ? ({ ...CDP_EVM_RPC_URLS, ...opts.rpcUrls } as Record<string, { rpcUrl: string }>)
    : CDP_EVM_RPC_URLS;

  return async (context) => {
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
 * supplied public JSON-RPC endpoint. Used for CDP facilitator networks that are
 * not covered by the CDP indexed token-balance API.
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
 * `params.address`, or `0n` when the asset is absent.
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
 * `params.address`, or `0n` when the asset is absent.
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
