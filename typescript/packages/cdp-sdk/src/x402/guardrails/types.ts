/**
 * Types and parsers for the {@link SpendControls} API.
 *
 * @packageDocumentation
 */
import type { Network } from "@x402/core/types";

/**
 * An asset identifier — typically an ERC-20 contract address or a Solana
 * SPL mint address.
 */
export type Asset = string;

/**
 * A wallet address. Normalization (e.g. lower-casing EVM addresses) is
 * handled in `./normalize.ts`.
 */
export type Address = string;

/**
 * A payment amount in base units (the smallest denomination for the asset),
 * optionally scoped to a specific asset.
 *
 * - `atomic` is a non-negative integer. Strings are accepted for convenience;
 *   use {@link parseAmount} to parse them.
 * - `asset` is optional but recommended. When set, caps and totals are scoped
 *   to that asset.
 *
 * **Use the contract address, not a ticker symbol.** `"usdc"` and
 * `"0x036cbd…"` are treated as different assets. Always use the same
 * identifier that will appear in `PaymentRequirements.asset`.
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
 * shorthand strings supported by {@link parseDuration} (`"500ms"`, `"30s"`,
 * `"5m"`, `"1h"`, `"24h"`, `"7d"`).
 */
export type Duration = number | string;

/**
 * Typed string constants for every {@link SpendControlErrorCode} value.
 *
 * Prefer referencing these constants over raw string literals.
 *
 * @example
 * ```ts
 * if (err instanceof SpendControlError && err.code === SpendControlErrorCodes.PER_PAYMENT_CAP) {
 *   // ...
 * }
 * ```
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
 * Error code for {@link SpendControlError}. Use this to identify the reason
 * a payment was blocked without parsing the error message.
 *
 * Derived from {@link SpendControlErrorCodes} — reference those typed
 * constants instead of raw string literals when possible.
 */
export type SpendControlErrorCode =
  (typeof SpendControlErrorCodes)[keyof typeof SpendControlErrorCodes];

/**
 * Structured context attached to a {@link SpendControlError}. Available
 * fields vary by error code.
 */
export type SpendControlErrorDetails = {
  /** Atomic amount (as a string) of the offending payment, when available. */
  attempted?: string;
  /** Atomic amount (as a string) of the configured limit, when available. */
  limit?: string;
  /** Asset symbol / contract address scoped to this error, when applicable. */
  asset?: Asset;
  /** Network identifier scoped to this error, when applicable. */
  network?: Network | string;
  /** PayTo address scoped to this error, when applicable. */
  payTo?: Address;
  /** The raw input that failed to parse, for `"amount_unparseable"` errors. */
  input?: unknown;
};

/**
 * Thrown when a payment is blocked by the configured spend controls. Check
 * the `code` field to identify the specific reason.
 */
export class SpendControlError extends Error {
  /** Identifies the type of violation. */
  public readonly code: SpendControlErrorCode;
  /** Structured context for the error (always defined, may be empty). */
  public readonly details: SpendControlErrorDetails;

  /**
   *
   * @param code
   * @param message
   * @param details
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
    // Restore prototype chain when subclassing Error in older transpile targets.
    Object.setPrototypeOf(this, SpendControlError.prototype);
  }
}

/**
 * A single recorded payment in the spend ledger.
 */
export type SpendLedgerEntry = {
  /** Payment amount in the asset's base units. */
  atomicAmount: bigint;
  /** Asset this payment was made in. */
  asset: Asset;
  /** Network the payment was made on. */
  network: Network;
  /** Payee address, normalized for the chain (lower-cased on EVM). */
  payTo: Address;
  /** When this entry was recorded (ms since Unix epoch). */
  at: number;
};

/**
 * Storage interface for the spend ledger.
 *
 * **The default implementation is in-memory and process-local.** That has
 * two important consequences that must be planned for:
 *
 *   1. **Cumulative spend resets on every process restart.** A
 *      `maxCumulativeSpend` cap configured against the default store does
 *      not survive a redeploy, crash, container restart, or worker
 *      respawn. After a restart the ledger is empty and the *full* cap is
 *      available again.
 *   2. **It is not shared across processes.** Two server replicas or
 *      worker threads using the in-memory store maintain independent
 *      totals; their *combined* spend can exceed the configured cap by up
 *      to `N × cap` for `N` processes.
 *
 * For any production workload where the cap must be enforced across
 * restarts or replicas, implement this interface against a shared,
 * durable backend (Redis, Postgres, DynamoDB, etc.) and pass an instance
 * via {@link SpendControls.store}.
 *
 * All methods are `async` so network I/O is supported naturally; failures
 * propagate to the caller and abort the payment.
 *
 * @example A minimal Redis-backed store sketch.
 * ```typescript
 * import type { SpendStore, SpendLedgerEntry } from "@coinbase/x402";
 *
 * function redisSpendStore(redis: Redis, key = "x402:spend-ledger"): SpendStore {
 *   const decode = (s: string) => {
 *     const e = JSON.parse(s);
 *     return { ...e, atomicAmount: BigInt(e.atomicAmount) } as SpendLedgerEntry;
 *   };
 *   const encode = (e: SpendLedgerEntry) =>
 *     JSON.stringify({ ...e, atomicAmount: e.atomicAmount.toString() });
 *
 *   return {
 *     async size() {
 *       return await redis.zcard(key);
 *     },
 *     async load() {
 *       const raw = await redis.zrange(key, 0, -1);
 *       return raw.map(decode);
 *     },
 *     async append(entry) {
 *       // Score by timestamp so prune can be a single ZREMRANGEBYSCORE.
 *       await redis.zadd(key, entry.at, encode(entry));
 *     },
 *     async prune(olderThanMs) {
 *       await redis.zremrangebyscore(key, "-inf", olderThanMs - 1);
 *     },
 *     async removeEntry(entry) {
 *       await redis.zrem(key, encode(entry));
 *     },
 *   };
 * }
 * ```
 *
 * Implementations SHOULD:
 *
 *   - Use atomic primitives (e.g. Redis `MULTI`/`EXEC` or DB transactions)
 *     for `append` so concurrent payments cannot lose entries. The
 *     {@link applySpendControls} layer serializes per-asset within a
 *     process; cross-process serialization is the store's responsibility.
 *   - Implement `removeEntry`, otherwise failed-payment rollback becomes a
 *     no-op and the ledger will over-count.
 *   - Implement `prune` if the store does not have native TTLs — without
 *     it, rolling-window caps work correctly (because `total()` filters
 *     by `since`) but storage usage grows unboundedly.
 */
export interface SpendStore {
  /**
   * Optional: return the current entry count without loading all entries.
   * When present, the tracker uses this for capacity checks instead of
   * calling `load()`.
   */
  size?(): Promise<number>;
  /** Returns all entries currently held by the store. */
  load(): Promise<SpendLedgerEntry[]>;
  /** Adds a single entry to the store. */
  append(entry: SpendLedgerEntry): Promise<void>;
  /**
   * Optional: drop entries older than `olderThanMs`. Called during rolling-
   * window pruning. Backends that handle expiry themselves can no-op this.
   */
  prune?(olderThanMs: number): Promise<void>;
  /**
   * Optional: drop the oldest `n` entries. Reserved for custom store
   * implementations that want their own trimming. Not called by the default
   * tracker.
   */
  dropOldest?(n: number): Promise<void>;
  /**
   * Optional: remove a specific entry by its field values. Used to undo a
   * provisional record if payment creation fails. If not implemented, the
   * tracker warns once and continues — over-counting is preferable to
   * silently under-counting.
   *
   * Should remove the most recent entry that matches all fields
   * `(at, asset, network, payTo, atomicAmount)`.
   */
  removeEntry?(entry: SpendLedgerEntry): Promise<void>;
}

/**
 * Configuration for spend controls. All fields are optional — omitting a
 * field disables the corresponding check. All limits are set in code;
 * there are no environment variable fallbacks.
 *
 * @example
 * ```ts
 * const USDC_BASE_SEPOLIA = "0x036cbd53842c5426634e7929541ec2318f3dcf7e";
 * const controls: SpendControls = {
 *   maxAmountPerPayment: { atomic: 2_000_000n, asset: USDC_BASE_SEPOLIA }, // 2 USDC
 *   maxCumulativeSpend: { atomic: 10_000_000n, asset: USDC_BASE_SEPOLIA }, // 10 USDC
 *   maxCumulativeSpendWindow: "24h",
 *   allowedNetworks: ["eip155:84532"],
 *   allowedAssets: [USDC_BASE_SEPOLIA],
 *   onApproachingLimit: (spent, limit) => log.warn("approaching", spent, limit),
 * };
 * ```
 */
export type SpendControls = {
  /** Hard cap on a single payment's atomic amount. */
  maxAmountPerPayment?: Amount;
  /**
   * Cap on total spend for a single asset across all payments. The `asset`
   * field is **required** — each asset uses different base units, so a
   * cross-asset total would be meaningless. Configure one cap per asset.
   *
   * Pair with {@link SpendControls.maxCumulativeSpendWindow} to limit spend
   * over a rolling window. Without a window, the cap applies for the lifetime
   * of the process.
   */
  maxCumulativeSpend?: Amount;
  /**
   * Rolling window for the cumulative cap. Older entries are pruned and
   * excluded from the running total.
   */
  maxCumulativeSpendWindow?: Duration;
  /**
   * Networks payments are allowed on. Empty or omitted means "allow all".
   * Accepts both short forms (`"base-sepolia"`) and CAIP-2 forms
   * (`"eip155:84532"`).
   */
  allowedNetworks?: Network[];
  /**
   * Allow-list of asset identifiers. Empty / omitted means "allow all". EVM
   * contract addresses are compared case-insensitively; SPL mints and
   * symbolic strings are compared as-is.
   */
  allowedAssets?: Asset[];
  /**
   * Allow-list of payee addresses. Empty / omitted means "allow all". EVM
   * payees are compared case-insensitively; SVM payees are case-sensitive.
   */
  allowedPayees?: Address[];
  /**
   * Notifier invoked when the rolling total crosses one of the configured
   * thresholds (default `[0.8, 0.95]`). Fires at most once per threshold per
   * rolling window.
   */
  onApproachingLimit?: (spent: Amount, limit: Amount) => void;
  /**
   * Thresholds (as fractions of the cap) that trigger
   * {@link SpendControls.onApproachingLimit}. Defaults to `[0.8, 0.95]`.
   * Values outside `(0, 1]` are silently dropped.
   */
  approachingLimitThresholds?: number[];
  /**
   * Maximum number of entries in the spend ledger. Once reached, new
   * entries are rejected so the cumulative total stays accurate rather than
   * silently dropping data. Defaults to `10_000`.
   */
  maxLedgerEntries?: number;
  /**
   * Custom storage backend (e.g. Redis-backed). Defaults to an in-memory
   * store.
   */
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
 * @param input
 * @throws {SpendControlError} `"amount_unparseable"` if the input can't be
 *   parsed.
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
 * Accepts:
 * - `bigint` — used as-is with the optional `asset` argument.
 * - `string` — a decimal integer (`"100000"`) or `"<asset>:<atomic>"` shorthand.
 * - `{ atomic, asset? }` — the `Amount` shape; `asset` argument takes priority.
 *
 * @param value
 * @param asset
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
        {
          input: value.toString(),
        },
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
