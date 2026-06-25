/*
 * Types and parsers for the SpendControls API.
 */
import type { Network } from "@x402/core/types";

/**
 * An asset identifier — typically an ERC-20 contract address or a Solana SPL mint address.
 */
export type Asset = string;

/**
 * A wallet address. Normalization (e.g. lower-casing EVM addresses) is handled in `./normalize.ts`.
 */
export type Address = string;

/**
 * A payment amount in base units (the smallest denomination for the asset),
 * optionally scoped to a specific asset.
 *
 * - `atomic` is a non-negative integer. Strings are accepted for convenience.
 * - `asset` is optional but recommended. When set, caps and totals are scoped to that asset.
 *
 * @example
 * ```ts
 * const cap: Amount = {
 *   atomic: 1_000_000n,
 *   asset: "0x036cbd53842c5426634e7929541ec2318f3dcf7e",
 * };
 * ```
 */
export type Amount = {
  atomic: bigint | string;
  asset?: Asset;
};

/**
 * A duration expressed as either a number of milliseconds or one of the
 * shorthand strings: `"500ms"`, `"30s"`, `"5m"`, `"1h"`, `"24h"`, `"7d"`.
 */
export type Duration = number | string;

/**
 * Typed string constants for every {@link SpendControlErrorCode} value.
 */
export const SpendControlErrorCodes = {
  PER_PAYMENT_CAP: "per_payment_cap",
  CUMULATIVE_CAP: "cumulative_cap",
  ALREADY_APPLIED: "already_applied",
  CONFIGURATION_INVALID: "configuration_invalid",
  LEDGER_CAPACITY_EXCEEDED: "ledger_capacity_exceeded",
  NETWORK_NOT_ALLOWED: "network_not_allowed",
  ASSET_NOT_ALLOWED: "asset_not_allowed",
  PAYEE_NOT_ALLOWED: "payee_not_allowed",
  AMOUNT_UNPARSEABLE: "amount_unparseable",
} as const;

/**
 * Error code for {@link SpendControlError}.
 */
export type SpendControlErrorCode =
  (typeof SpendControlErrorCodes)[keyof typeof SpendControlErrorCodes];

/**
 * Structured context attached to a {@link SpendControlError}.
 */
export type SpendControlErrorDetails = {
  attempted?: string;
  limit?: string;
  asset?: Asset;
  network?: Network | string;
  payTo?: Address;
  input?: unknown;
};

/**
 * Thrown when a payment is blocked by the configured spend controls.
 */
export class SpendControlError extends Error {
  /** - Identifies the type of violation. */
  public readonly code: SpendControlErrorCode;

  /** - Structured context for the error (always defined, may be empty). */
  public readonly details: SpendControlErrorDetails;

  /**
   * Creates a SpendControlError with the given code and message.
   *
   * @param code - The error code identifying the violation type.
   * @param message - Human-readable error message.
   * @param details - Optional structured context for the error.
   */
  constructor(
    code: SpendControlErrorCode,
    message: string,
    details: SpendControlErrorDetails = {},
  ) {
    super(message);
    this.name = "SpendControlError";
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, SpendControlError.prototype);
  }
}

/**
 * A single recorded payment in the spend ledger.
 */
export type SpendLedgerEntry = {
  atomicAmount: bigint;
  asset: Asset;
  network: Network;
  payTo: Address;
  at: number;
};

/**
 * Storage interface for the spend ledger.
 *
 * **The default implementation is in-memory and process-local.** For
 * production workloads where the cap must be enforced across restarts or
 * replicas, implement this interface against a shared durable backend (Redis,
 * Postgres, DynamoDB, etc.) and pass an instance via {@link SpendControls.store}.
 */
export interface SpendStore {
  /** - Optional: return the current entry count. */
  size?(): Promise<number>;
  /** - Returns all entries currently held by the store. */
  load(): Promise<SpendLedgerEntry[]>;
  /** - Adds a single entry to the store. */
  append(entry: SpendLedgerEntry): Promise<void>;
  /** - Optional: drop entries older than `olderThanMs`. */
  prune?(olderThanMs: number): Promise<void>;
  /** - Optional: drop the oldest `n` entries. */
  dropOldest?(n: number): Promise<void>;
  /** - Optional: remove a specific entry by its field values. */
  removeEntry?(entry: SpendLedgerEntry): Promise<void>;
}

/**
 * Configuration for spend controls. All fields are optional.
 *
 * @example
 * ```ts
 * const USDC_BASE = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
 * const controls: SpendControls = {
 *   maxAmountPerPayment: { atomic: 10_000n, asset: USDC_BASE },
 *   maxCumulativeSpend: { atomic: 50_000n, asset: USDC_BASE },
 *   maxCumulativeSpendWindow: "24h",
 *   allowedNetworks: ["eip155:8453"],
 * };
 * ```
 */
export type SpendControls = {
  /**
   * Hard per-payment cap. If `asset` is set the cap only applies to payments in
   * that asset — payments in any other asset are left uncapped by this field
   * (atomic units are not comparable across assets with different decimals).
   * Omit `asset` to cap every payment by raw atomic amount.
   */
  maxAmountPerPayment?: Amount;
  /**
   * Rolling cumulative cap. Unlike `maxAmountPerPayment`, `asset` is required
   * (enforced when spend controls are applied) because cross-asset atomic units
   * cannot be summed.
   */
  maxCumulativeSpend?: Amount;
  maxCumulativeSpendWindow?: Duration;
  allowedNetworks?: Network[];
  allowedAssets?: Asset[];
  allowedPayees?: Address[];
  onApproachingLimit?: (spent: Amount, limit: Amount) => void;
  approachingLimitThresholds?: number[];
  maxLedgerEntries?: number;
  store?: SpendStore;
};

const MS_UNIT_FACTORS: Record<string, number> = {
  ms: 1,
  s: 1_000,
  m: 60 * 1_000,
  h: 60 * 60 * 1_000,
  d: 24 * 60 * 60 * 1_000,
};

const DURATION_PATTERN = /^\s*(\d+(?:\.\d+)?)\s*(ms|s|m|h|d)\s*$/i;

/**
 * Converts a {@link Duration} to milliseconds.
 *
 * Accepts a non-negative number (already in milliseconds) or a shorthand
 * string: `"500ms"`, `"30s"`, `"5m"`, `"1h"`, `"24h"`, `"7d"`.
 *
 * @param input - The duration value to parse.
 * @returns The duration in milliseconds.
 * @throws {SpendControlError} `"amount_unparseable"` if the input can't be parsed.
 */
export function parseDuration(input: Duration): number {
  if (typeof input === "number") {
    if (!Number.isFinite(input) || input < 0) {
      throw new SpendControlError(
        "amount_unparseable",
        `Duration must be a non-negative finite number, received ${input}`,
        { input },
      );
    }
    return Math.floor(input);
  }
  const match = DURATION_PATTERN.exec(input);
  if (!match) {
    throw new SpendControlError(
      "amount_unparseable",
      `Cannot parse duration ${JSON.stringify(input)}; expected e.g. "500ms", "30s", "5m", "1h", "24h", "7d"`,
      { input },
    );
  }
  const [, numericPart, unit] = match;
  const factor = MS_UNIT_FACTORS[unit.toLowerCase()];
  return Math.floor(Number(numericPart) * factor);
}

const AMOUNT_SHORTHAND_PATTERN = /^([^:]+):(\d+)$/;

/**
 * Parses an amount into `{ atomic: bigint; asset?: string }`.
 *
 * @param value - The amount value to parse (bigint, string, or Amount object).
 * @param asset - Optional asset identifier to scope the amount.
 * @returns Parsed amount with atomic bigint value and optional asset.
 * @throws {SpendControlError} `"amount_unparseable"` on bad input.
 */
export function parseAmount(
  value: bigint | string | Amount,
  asset?: Asset,
): { atomic: bigint; asset?: string } {
  if (typeof value === "bigint") {
    if (value < 0n) {
      throw new SpendControlError(
        "amount_unparseable",
        `Amount must be non-negative, got ${value}`,
        { input: value.toString() },
      );
    }
    return { atomic: value, asset };
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") {
      throw new SpendControlError("amount_unparseable", "Amount string is empty", { input: value });
    }
    const shorthand = AMOUNT_SHORTHAND_PATTERN.exec(trimmed);
    if (shorthand) {
      const [, parsedAsset, parsedAtomic] = shorthand;
      return parseAmount({ atomic: parsedAtomic, asset: parsedAsset }, asset ?? parsedAsset);
    }
    if (!/^\d+$/.test(trimmed)) {
      throw new SpendControlError(
        "amount_unparseable",
        `Cannot parse amount ${JSON.stringify(value)}; expected a non-negative integer or an "<asset>:<atomic>" shorthand`,
        { input: value },
      );
    }
    return { atomic: BigInt(trimmed), asset };
  }
  if (value && typeof value === "object" && "atomic" in value) {
    const innerAsset = asset ?? value.asset;
    return parseAmount(value.atomic as bigint | string, innerAsset);
  }
  throw new SpendControlError(
    "amount_unparseable",
    `Cannot parse amount: unsupported value of type ${typeof value}`,
    { input: value as unknown },
  );
}
