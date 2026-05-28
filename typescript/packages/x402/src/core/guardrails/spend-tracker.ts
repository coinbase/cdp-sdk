/**
 * Ledger that tracks cumulative spend and backs the `onApproachingLimit`
 * notifier.
 *
 * Spend is tracked per asset — there is no cross-asset total because each
 * asset uses different base units. All public methods are `async` so the
 * tracker can be backed by an external store (Redis, database, etc.) without
 * any changes to the calling code. The default in-memory store resolves
 * synchronously.
 *
 * @packageDocumentation
 */
import type { Network } from "@x402/core/types";

import type { Address, Asset, SpendLedgerEntry, SpendStore } from "./types.js";
import { SpendControlError } from "./types.js";

/**
 * Default maximum number of ledger entries kept in memory. Once this limit
 * is reached, new entries are rejected so the cumulative total stays accurate.
 */
export const DEFAULT_MAX_LEDGER_ENTRIES = 10_000;

/**
 * Constructor options for {@link SpendTracker}. All fields are optional.
 */
export interface SpendTrackerOptions {
  /**
   * Maximum number of entries to hold in memory. Once reached, new entries
   * are rejected with a `SpendControlError`.
   * @defaultValue {@link DEFAULT_MAX_LEDGER_ENTRIES}
   */
  maxLedgerEntries?: number;
  /**
   * Storage backend. Defaults to an in-memory array-backed store.
   */
  store?: SpendStore;
}

/**
 * Argument shape for {@link SpendTracker.record}.
 */
export interface RecordSpendInput {
  atomicAmount: bigint;
  asset: Asset;
  network: Network;
  payTo: Address;
}

/**
 * Argument shape for {@link SpendTracker.total}.
 */
export interface TotalSpendQuery {
  asset: Asset;
  /** Inclusive lower bound (ms since epoch). Entries strictly older are excluded. */
  since?: number;
}

/**
 * Default in-memory {@link SpendStore} backed by a plain array.
 */
class InMemorySpendStore implements SpendStore {
  private readonly entries: SpendLedgerEntry[] = [];

  async size(): Promise<number> {
    return this.entries.length;
  }

  async load(): Promise<SpendLedgerEntry[]> {
    return this.entries;
  }

  async append(entry: SpendLedgerEntry): Promise<void> {
    this.entries.push(entry);
  }

  async prune(olderThanMs: number): Promise<void> {
    let cut = 0;
    while (cut < this.entries.length && this.entries[cut].at < olderThanMs) {
      cut++;
    }
    if (cut > 0) {
      this.entries.splice(0, cut);
    }
  }

  async removeEntry(entry: SpendLedgerEntry): Promise<void> {
    // Scan from the end so we remove the most recent match, not an older one
    // that happens to have the same values.
    for (let i = this.entries.length - 1; i >= 0; i--) {
      const e = this.entries[i];
      if (
        e.at === entry.at &&
        e.atomicAmount === entry.atomicAmount &&
        e.asset === entry.asset &&
        e.network === entry.network &&
        e.payTo === entry.payTo
      ) {
        this.entries.splice(i, 1);
        return;
      }
    }
  }
}

/**
 * Tracks spend per asset in an append-only ledger. Each asset is totaled
 * independently — there is no cross-asset sum.
 *
 * All read/write methods are `async` so external stores (Redis, etc.) can be
 * plugged in without changing the calling code.
 */
export class SpendTracker {
  private readonly store: SpendStore;
  private readonly maxLedgerEntries: number;
  /** Prevents repeated warnings when the store doesn't implement `removeEntry`. */
  private warnedOnRemove = false;

  constructor(options: SpendTrackerOptions = {}) {
    this.store = options.store ?? new InMemorySpendStore();
    this.maxLedgerEntries = options.maxLedgerEntries ?? DEFAULT_MAX_LEDGER_ENTRIES;
    if (!Number.isInteger(this.maxLedgerEntries) || this.maxLedgerEntries <= 0) {
      throw new SpendControlError(
        "configuration_invalid",
        `maxLedgerEntries must be a positive integer, received ${this.maxLedgerEntries}`,
        { input: options.maxLedgerEntries },
      );
    }
  }

  /**
   * Adds a spend entry to the ledger and returns it. The returned entry can
   * be passed to {@link SpendTracker.removeEntry} to undo the record if the
   * payment later fails.
   */
  async record(input: RecordSpendInput): Promise<SpendLedgerEntry> {
    if (input.atomicAmount < 0n) {
      throw new SpendControlError("amount_unparseable", "Cannot record a negative spend", {
        attempted: input.atomicAmount.toString(),
        asset: input.asset,
        network: input.network,
        payTo: input.payTo,
      });
    }
    const entry: SpendLedgerEntry = {
      atomicAmount: input.atomicAmount,
      asset: input.asset,
      network: input.network,
      payTo: input.payTo,
      at: Date.now(),
    };
    const currentSize = this.store.size
      ? await this.store.size()
      : (await this.store.load()).length;
    if (currentSize >= this.maxLedgerEntries) {
      throw new SpendControlError(
        "ledger_capacity_exceeded",
        `SpendTracker ledger is full (maxLedgerEntries=${this.maxLedgerEntries}); rejecting new spend record to prevent under-counting.`,
      );
    }
    await this.store.append(entry);
    return entry;
  }

  /**
   * Sum atomic amounts for the given asset, optionally restricted to entries
   * recorded at or after `since`.
   */
  async total(query: TotalSpendQuery): Promise<bigint> {
    if (query.since !== undefined && this.store.prune) {
      await this.store.prune(query.since);
    }
    let sum = 0n;
    const entries = await this.store.load();
    for (const entry of entries) {
      if (query.since !== undefined && entry.at < query.since) continue;
      if (entry.asset !== query.asset) continue;
      sum += entry.atomicAmount;
    }
    return sum;
  }

  /**
   * Drop entries older than `now - windowMs`. Idempotent.
   */
  async prune(now: number, windowMs?: number): Promise<void> {
    if (windowMs === undefined || windowMs <= 0) return;
    const cutoff = now - windowMs;
    if (this.store.prune) {
      await this.store.prune(cutoff);
    }
    // Stores without `prune` are fine — `total()` applies `since` filtering anyway.
  }

  /**
   * Removes a previously recorded entry, undoing its contribution to the
   * cumulative total. Used to roll back a provisional record if payment
   * creation fails.
   *
   * If the store doesn't implement `removeEntry`, the tracker warns once and
   * continues — over-counting is preferable to silently under-counting.
   */
  async removeEntry(entry: SpendLedgerEntry): Promise<void> {
    if (this.store.removeEntry) {
      await this.store.removeEntry(entry);
      return;
    }
    if (!this.warnedOnRemove) {
      console.warn(
        `[@coinbase/x402] SpendTracker: store does not implement removeEntry; ` +
          `rollback is a no-op so the cumulative ledger may over-count after a payment failure.`,
      );
      this.warnedOnRemove = true;
    }
  }

  /**
   * Returns all current ledger entries as a read-only snapshot.
   * Intended for tests and debugging — do not mutate the result.
   */
  async entries(): Promise<readonly SpendLedgerEntry[]> {
    return this.store.load();
  }
}
