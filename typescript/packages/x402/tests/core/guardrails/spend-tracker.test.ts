import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { SpendTracker } from "../../../src/core/guardrails/spend-tracker.js";
import type { SpendStore } from "../../../src/core/guardrails/types.js";

describe("guardrails/spend-tracker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("record + total", () => {
    it("sums entries for the requested asset only", async () => {
      const tracker = new SpendTracker();
      await tracker.record({
        atomicAmount: 10n,
        asset: "usdc",
        network: "eip155:8453",
        payTo: "0x1",
      });
      await tracker.record({
        atomicAmount: 5n,
        asset: "usdc",
        network: "eip155:8453",
        payTo: "0x1",
      });
      await tracker.record({
        atomicAmount: 100n,
        asset: "dai",
        network: "eip155:8453",
        payTo: "0x2",
      });

      expect(await tracker.total({ asset: "usdc" })).toBe(15n);
      expect(await tracker.total({ asset: "dai" })).toBe(100n);
      expect(await tracker.total({ asset: "weth" })).toBe(0n);
    });

    it("respects the `since` lower bound", async () => {
      const tracker = new SpendTracker();
      vi.setSystemTime(1_000);
      await tracker.record({
        atomicAmount: 10n,
        asset: "usdc",
        network: "eip155:8453",
        payTo: "0x1",
      });
      vi.setSystemTime(2_000);
      await tracker.record({
        atomicAmount: 7n,
        asset: "usdc",
        network: "eip155:8453",
        payTo: "0x1",
      });
      expect(await tracker.total({ asset: "usdc", since: 1_000 })).toBe(17n);
      expect(await tracker.total({ asset: "usdc", since: 1_500 })).toBe(7n);
      expect(await tracker.total({ asset: "usdc", since: 2_000 })).toBe(7n);
    });

    it("uses Date.now() for default timestamps", async () => {
      const tracker = new SpendTracker();
      vi.setSystemTime(4_242);
      const entry = await tracker.record({
        atomicAmount: 1n,
        asset: "usdc",
        network: "eip155:8453",
        payTo: "0x1",
      });
      expect(entry.at).toBe(4_242);
    });

    it("rejects negative spends with SpendControlError", async () => {
      const tracker = new SpendTracker();
      await expect(
        tracker.record({
          atomicAmount: -1n,
          asset: "usdc",
          network: "eip155:8453",
          payTo: "0x1",
        }),
      ).rejects.toMatchObject({ code: "amount_unparseable" });
    });

    it("prunes via store.prune when total() is called with `since`", async () => {
      const entries = [
        {
          atomicAmount: 4n,
          asset: "usdc",
          network: "eip155:8453",
          payTo: "0x1",
          at: 100,
        },
        {
          atomicAmount: 7n,
          asset: "usdc",
          network: "eip155:8453",
          payTo: "0x1",
          at: 200,
        },
      ];
      const store: SpendStore = {
        async load() {
          return entries;
        },
        async append(entry) {
          entries.push(entry);
        },
        async prune(olderThanMs) {
          for (let i = entries.length - 1; i >= 0; i--) {
            if (entries[i].at < olderThanMs) entries.splice(i, 1);
          }
        },
      };
      const tracker = new SpendTracker({ store });
      await expect(tracker.total({ asset: "usdc", since: 150 })).resolves.toBe(7n);
      expect(entries).toHaveLength(1);
    });
  });

  describe("prune", () => {
    it("drops entries strictly older than the cutoff", async () => {
      const tracker = new SpendTracker();
      vi.setSystemTime(1_000);
      await tracker.record({
        atomicAmount: 1n,
        asset: "usdc",
        network: "eip155:8453",
        payTo: "0x1",
      });
      vi.setSystemTime(2_000);
      await tracker.record({
        atomicAmount: 2n,
        asset: "usdc",
        network: "eip155:8453",
        payTo: "0x1",
      });
      vi.setSystemTime(3_000);
      await tracker.record({
        atomicAmount: 3n,
        asset: "usdc",
        network: "eip155:8453",
        payTo: "0x1",
      });
      // Window of 1500ms relative to now=3500 → cutoff 2000. Entry at 1000 drops.
      await tracker.prune(3_500, 1_500);
      const entries = await tracker.entries();
      expect(entries.map((e) => e.atomicAmount)).toEqual([2n, 3n]);
    });

    it("keeps an entry exactly at the cutoff boundary", async () => {
      const tracker = new SpendTracker();
      vi.setSystemTime(2_000);
      await tracker.record({
        atomicAmount: 1n,
        asset: "usdc",
        network: "eip155:8453",
        payTo: "0x1",
      });
      // cutoff 2000 → entry at 2000 stays (strict less-than).
      await tracker.prune(3_000, 1_000);
      expect(await tracker.entries()).toHaveLength(1);
    });

    it("is a no-op when window is undefined or non-positive", async () => {
      const tracker = new SpendTracker();
      await tracker.record({
        atomicAmount: 1n,
        asset: "usdc",
        network: "eip155:8453",
        payTo: "0x1",
      });
      await tracker.prune(Date.now());
      await tracker.prune(Date.now(), 0);
      expect(await tracker.entries()).toHaveLength(1);
    });
  });

  describe("maxLedgerEntries capacity", () => {
    it("rejects new records once the ledger reaches capacity", async () => {
      const tracker = new SpendTracker({ maxLedgerEntries: 3 });
      for (let i = 0; i < 3; i++) {
        vi.setSystemTime(i);
        await tracker.record({
          atomicAmount: BigInt(i + 1),
          asset: "usdc",
          network: "eip155:8453",
          payTo: "0x1",
        });
      }
      vi.setSystemTime(99);
      await expect(
        tracker.record({
          atomicAmount: 4n,
          asset: "usdc",
          network: "eip155:8453",
          payTo: "0x1",
        }),
      ).rejects.toMatchObject({ code: "ledger_capacity_exceeded" });
      expect(await tracker.entries()).toHaveLength(3);
    });

    it("validates maxLedgerEntries as a positive integer", () => {
      expect(() => new SpendTracker({ maxLedgerEntries: 0 })).toThrowError(
        expect.objectContaining({ code: "configuration_invalid" }),
      );
      expect(() => new SpendTracker({ maxLedgerEntries: -1 })).toThrowError(
        expect.objectContaining({ code: "configuration_invalid" }),
      );
      expect(() => new SpendTracker({ maxLedgerEntries: 1.5 })).toThrowError(
        expect.objectContaining({ code: "configuration_invalid" }),
      );
    });

    it("enforces capacity for custom stores too", async () => {
      const entries: Array<unknown> = [];
      const store: SpendStore = {
        async load() {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return entries as any;
        },
        async append(entry) {
          entries.push(entry);
        },
      };
      const tracker = new SpendTracker({ maxLedgerEntries: 1, store });
      await tracker.record({
        atomicAmount: 1n,
        asset: "usdc",
        network: "eip155:8453",
        payTo: "0x1",
      });
      await expect(
        tracker.record({
          atomicAmount: 2n,
          asset: "usdc",
          network: "eip155:8453",
          payTo: "0x1",
        }),
      ).rejects.toMatchObject({ code: "ledger_capacity_exceeded" });
      expect(await tracker.entries()).toHaveLength(1);
    });

    it("uses store.size when available instead of loading all entries", async () => {
      const load = vi.fn(async () => []);
      const size = vi.fn(async () => 1);
      const append = vi.fn(async () => {});
      const store: SpendStore = { load, size, append };
      const tracker = new SpendTracker({ maxLedgerEntries: 1, store });
      await expect(
        tracker.record({
          atomicAmount: 1n,
          asset: "usdc",
          network: "eip155:8453",
          payTo: "0x1",
        }),
      ).rejects.toMatchObject({ code: "ledger_capacity_exceeded" });
      expect(size).toHaveBeenCalledTimes(1);
      expect(load).not.toHaveBeenCalled();
      expect(append).not.toHaveBeenCalled();
    });
  });

  describe("removeEntry (rollback)", () => {
    it("removes a previously recorded entry by id", async () => {
      const tracker = new SpendTracker();
      const entry = await tracker.record({
        atomicAmount: 5n,
        asset: "usdc",
        network: "eip155:8453",
        payTo: "0x1",
      });
      expect(await tracker.total({ asset: "usdc" })).toBe(5n);
      await tracker.removeEntry(entry);
      expect(await tracker.total({ asset: "usdc" })).toBe(0n);
    });

    it("is a no-op when the entry has already been removed", async () => {
      const tracker = new SpendTracker();
      const entry = await tracker.record({
        atomicAmount: 5n,
        asset: "usdc",
        network: "eip155:8453",
        payTo: "0x1",
      });
      await tracker.removeEntry(entry);
      // Second removal is harmless — rollback paths must be idempotent.
      await expect(tracker.removeEntry(entry)).resolves.not.toThrow();
    });
  });
});
