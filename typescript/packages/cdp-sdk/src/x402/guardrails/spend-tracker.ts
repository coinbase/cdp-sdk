/*
 * Ledger that tracks cumulative spend and backs the onApproachingLimit notifier.
 */
import { SpendControlError } from "./types.js";

import type { Address, Asset, SpendLedgerEntry, SpendStore } from "./types.js";
import type { Network } from "@x402/core/types";

/**
 * Default maximum number of ledger entries kept in memory.
 */
export const DEFAULT_MAX_LEDGER_ENTRIES = 10_000;

/**
 * Constructor options for {@link SpendTracker}.
 */
export interface SpendTrackerOptions {
  /**
   * Maximum number of entries to hold. Defaults to {@link DEFAULT_MAX_LEDGER_ENTRIES}.
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
  /** - Payment amount in base units. */
  atomicAmount: bigint;
  /** - Asset identifier. */
  asset: Asset;
  /** - Network the payment was made on. */
  network: Network;
  /** - Payee address. */
  payTo: Address;
}

/**
 * Argument shape for {@link SpendTracker.total}.
 */
export interface TotalSpendQuery {
  /** - Asset to sum. */
  asset: Asset;
  /** - Inclusive lower bound (ms since epoch). Entries strictly older are excluded. */
  since?: number;
}

/**
 * Default in-memory SpendStore backed by a plain array.
 */
class InMemorySpendStore implements SpendStore {
  private readonly entries: SpendLedgerEntry[] = [];

  /**
   * Returns the current entry count.
   *
   * @returns The number of entries in the store.
   */
  async size(): Promise<number> {
    return this.entries.length;
  }

  /**
   * Returns all entries currently held by the store.
   *
   * @returns All ledger entries.
   */
  async load(): Promise<SpendLedgerEntry[]> {
    return this.entries;
  }

  /**
   * Adds a single entry to the store.
   *
   * @param entry - The ledger entry to add.
   */
  async append(entry: SpendLedgerEntry): Promise<void> {
    this.entries.push(entry);
  }

  /**
   * Drops entries older than `olderThanMs`.
   *
   * @param olderThanMs - Cutoff timestamp in milliseconds.
   */
  async prune(olderThanMs: number): Promise<void> {
    let cut = 0;
    while (cut < this.entries.length && this.entries[cut].at < olderThanMs) {
      cut++;
    }
    if (cut > 0) this.entries.splice(0, cut);
  }

  /**
   * Removes a specific entry by its field values.
   *
   * @param entry - The ledger entry to remove.
   */
  async removeEntry(entry: SpendLedgerEntry): Promise<void> {
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
 * Tracks spend per asset in an append-only ledger.
 */
export class SpendTracker {
  private readonly store: SpendStore;
  private readonly maxLedgerEntries: number;
  private warnedOnRemove = false;

  /**
   * Creates a new SpendTracker.
   *
   * @param options - Optional configuration for the tracker.
   */
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
   * Adds a spend entry to the ledger and returns it.
   *
   * @param input - The spend record to add.
   * @returns The recorded ledger entry.
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
   *
   * @param query - Query parameters specifying asset and optional time window.
   * @returns The total atomic amount spent.
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
   * Drop entries older than `now - windowMs`.
   *
   * @param now - Current timestamp in milliseconds.
   * @param windowMs - Optional rolling window size in milliseconds.
   */
  async prune(now: number, windowMs?: number): Promise<void> {
    if (windowMs === undefined || windowMs <= 0) return;
    const cutoff = now - windowMs;
    if (this.store.prune) {
      await this.store.prune(cutoff);
    }
  }

  /**
   * Removes a previously recorded entry, undoing its contribution to the cumulative total.
   *
   * @param entry - The ledger entry to remove.
   */
  async removeEntry(entry: SpendLedgerEntry): Promise<void> {
    if (this.store.removeEntry) {
      await this.store.removeEntry(entry);
      return;
    }
    if (!this.warnedOnRemove) {
      // eslint-disable-next-line no-console
      console.warn(
        `[@coinbase/cdp-sdk/x402] SpendTracker: store does not implement removeEntry; ` +
          `rollback is a no-op so the cumulative ledger may over-count after a payment failure.`,
      );
      this.warnedOnRemove = true;
    }
  }

  /**
   * Returns all current ledger entries as a read-only snapshot.
   *
   * @returns All current entries.
   */
  async entries(): Promise<readonly SpendLedgerEntry[]> {
    return this.store.load();
  }
}
