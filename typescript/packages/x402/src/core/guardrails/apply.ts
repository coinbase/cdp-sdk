/**
 * Wires a {@link SpendControls} configuration onto an upstream `x402Client`.
 *
 * Registers one allow-list policy, one before-hook (cap enforcement + spend
 * recording), one after-hook (threshold notifications), and one failure-hook
 * (rollback of anticipatory records) on the client.
 *
 * @packageDocumentation
 */
import type { x402Client } from "@x402/core/client";
import type {
  AfterPaymentCreationHook,
  BeforePaymentCreationHook,
  OnPaymentCreationFailureHook,
  PaymentPolicy,
} from "@x402/core/client";
import type { Network, PaymentPayload, PaymentRequirements } from "@x402/core/types";

import { normalizeAsset, normalizeNetwork, normalizePayee } from "./normalize.js";
import { SpendTracker } from "./spend-tracker.js";
import {
  parseAmount,
  parseDuration,
  SpendControlError,
  type Address,
  type Amount,
  type Asset,
  type SpendControlErrorCode,
  type SpendControls,
  type SpendLedgerEntry,
} from "./types.js";

/** Default thresholds (as fractions of the cap) for `onApproachingLimit`. */
export const DEFAULT_APPROACHING_LIMIT_THRESHOLDS: readonly number[] = [0.8, 0.95];

/**
 * Per-asset lock state, keyed by `SpendStore` instance. Lets multiple clients
 * that share the same store object also share their lock state.
 */
const STORE_ASSET_MUTEX = new WeakMap<object, Map<string, Promise<unknown>>>();

/**
 * When multiple `applySpendControls` calls share the same `controls.store`,
 * their provisional atomic totals must also be shared so that
 * `fireThresholdsForPayment` subtracts the combined in-flight amount from the
 * shared tracker total rather than only one client's contribution.
 *
 * Keyed by the same store object used for `STORE_ASSET_MUTEX`.
 */
const STORE_PROVISIONAL_ATOMIC = new WeakMap<object, Map<string, bigint>>();

/**
 * Marks a client that already has spend controls applied, preventing
 * double-registration that would double-count cumulative spend.
 */
const APPLIED_MARKER = Symbol.for("@coinbase/x402/spend-controls/applied");

/**
 * Symbol-keyed property that carries the provisional {@link SpendLedgerEntry}
 * forward through a payment creation context. Symbol keys survive object
 * spread (`{ ...context, … }`), so the after-hook and failure-hook can read
 * it without an external Map.
 */
const RECORDED_ENTRY = Symbol("@coinbase/x402/spend-controls/recorded-entry");

/**
 * Symbol-keyed property on a client that carries its settlement-aware
 * confirm/rollback registry. Used by settlement-aware fetch wrappers (e.g.
 * `wrapFetchWithPayment` in `@coinbase/x402`) to finalize or undo the
 * provisional spend record after the HTTP settlement response is known.
 *
 * The registry holds entries keyed by the {@link PaymentPayload} object
 * returned from `x402Client.createPaymentPayload`. Lookups use object
 * identity so the wrapper must pass back the exact payload reference.
 */
export const SPEND_CONTROLS_REGISTRY = Symbol.for("@coinbase/x402/spend-controls/registry");

/**
 * Per-payment book-keeping captured by the before-hook (atomically with the
 * cap check) and consumed by {@link SpendControlsRegistry.confirm} /
 * {@link SpendControlsRegistry.rollback} to finalize accounting once the HTTP
 * settlement outcome is known.
 */
type PendingPayment = {
  entry: SpendLedgerEntry;
  /** Normalized asset key used to scope threshold notification state. */
  notifyKey: string;
  /** Original (un-normalized) asset string from the requirements, used in
   *  notification callbacks so user-facing values match what was configured. */
  reqAsset: string;
  /** Thresholds (in `[0,1]`) this payment caused us to notify on, so that a
   *  later rollback can reset them. */
  notifiedThresholds: Set<number>;
};

/**
 * Settlement-aware finalization handlers attached to a client by
 * {@link applySpendControls}. Exposed via {@link SPEND_CONTROLS_REGISTRY}.
 */
export interface SpendControlsRegistry {
  /**
   * Mark a previously-created payment as settled on-chain. Fires any
   * threshold notifications crossed by this payment that were deferred from
   * payment creation.
   *
   * No-op if `paymentPayload` was not produced by a client with spend
   * controls or if it has already been confirmed/rolled back.
   */
  confirm(paymentPayload: PaymentPayload): Promise<void>;
  /**
   * Undo a previously-recorded provisional spend after the server's
   * settlement response indicates the payment did NOT settle on-chain
   * (e.g. HTTP 4xx/5xx after a successful payload, or a SettleResponse
   * with `success: false`).
   *
   * Removes the entry from the spend ledger and resets the
   * `onApproachingLimit` notification state for any thresholds this payment
   * caused to fire, so a subsequent successful retry will re-notify as
   * expected.
   *
   * No-op if `paymentPayload` was not produced by a client with spend
   * controls or if it has already been confirmed/rolled back.
   */
  rollback(paymentPayload: PaymentPayload): Promise<void>;
}

const FILTER_FAILURE_NETWORK_NOT_ALLOWED = "network_not_allowed" satisfies SpendControlErrorCode;
const FILTER_FAILURE_ASSET_NOT_ALLOWED = "asset_not_allowed" satisfies SpendControlErrorCode;
const FILTER_FAILURE_PAYEE_NOT_ALLOWED = "payee_not_allowed" satisfies SpendControlErrorCode;

type PolicyFilterFailure =
  | typeof FILTER_FAILURE_NETWORK_NOT_ALLOWED
  | typeof FILTER_FAILURE_ASSET_NOT_ALLOWED
  | typeof FILTER_FAILURE_PAYEE_NOT_ALLOWED;

type FilterRule = {
  readonly code: PolicyFilterFailure;
  readonly message: string;
  /** Lower value = higher priority for error reporting when all options are filtered out. */
  readonly errorPriority: number;
  readonly check: (req: PaymentRequirements) => boolean;
};

/**
 * The active spend controls configuration after defaults are filled in.
 * Returned by {@link applySpendControls} as a frozen snapshot.
 */
export type ResolvedSpendControls = Readonly<{
  maxAmountPerPayment?: { atomic: bigint; asset?: string };
  maxCumulativeSpend?: { atomic: bigint; asset?: string };
  maxCumulativeSpendWindowMs?: number;
  allowedNetworks: ReadonlySet<Network>;
  allowedAssets: ReadonlySet<Asset>;
  /**
   * Snapshot of the configured payee allow-list for inspection.
   *
   * Normalized via {@link normalizeAsset}: EVM-format addresses
   * (`0x` + 40 hex chars) are lower-cased; all others are passed through
   * unchanged. This matches what {@link normalizePayee} produces for every
   * supported chain family, so values here are consistent with the
   * policy's comparisons.
   */
  allowedPayees: ReadonlySet<Address>;
  approachingLimitThresholds: ReadonlyArray<number>;
  onApproachingLimit?: (spent: Amount, limit: Amount) => void;
  /** The shared {@link SpendTracker} the hooks read/write. */
  tracker: SpendTracker;
}>;

/**
 * Keep the guardrails before-hook as the final before-hook registered on
 * the client, so any user-registered before-hooks that abort or throw after
 * `applySpendControls()` do not leave a stale provisional spend entry.
 *
 * The upstream `x402Client` runs before-hooks in a plain loop outside its
 * try/catch: if a hook throws or returns `{ abort }`, neither the after-hook
 * nor the failure-hook is invoked. Guardrails must therefore be last so it
 * never records spend before a later hook can abort.
 *
 * After registering the guardrails hook we replace `onBeforePaymentCreation`
 * on the client instance so that subsequent registrations insert their hook
 * *before* the guardrails hook in the array. This mirrors the Python
 * `_pin_guardrails_before_hook_last` implementation.
 */
function pinGuardrailsBeforeHookLast(
  client: x402Client,
  guardrailsHook: BeforePaymentCreationHook,
): void {
  // Reach into the upstream x402Client's internal hook array via a cast.
  // The field name matches the open-source x402Client implementation.
  type WithHookArray = { beforePaymentCreationHooks?: BeforePaymentCreationHook[] };
  const hooks = (client as unknown as WithHookArray).beforePaymentCreationHooks;
  if (!Array.isArray(hooks)) return;

  const original = client.onBeforePaymentCreation.bind(client);
  (client as unknown as { onBeforePaymentCreation: unknown }).onBeforePaymentCreation = (
    hook: BeforePaymentCreationHook,
  ): x402Client => {
    const idx = hooks.indexOf(guardrailsHook);
    if (idx === -1) {
      // Guardrails hook was unexpectedly removed — fall back to normal append.
      return original(hook);
    }
    hooks.splice(idx, 0, hook);
    return client;
  };
}

function buildAllowedSet<T extends string>(
  values: T[] | undefined,
  normalize: (value: T) => T,
): ReadonlySet<T> {
  if (!values || values.length === 0) return new Set();
  return new Set(values.map((value) => normalize(value)));
}

function dedupeThresholds(thresholds: number[] | undefined): number[] {
  const fallback = DEFAULT_APPROACHING_LIMIT_THRESHOLDS;
  const source = thresholds && thresholds.length > 0 ? thresholds : fallback;
  return Array.from(new Set(source.filter((t) => Number.isFinite(t) && t > 0 && t <= 1))).sort(
    (a, b) => a - b,
  );
}

/**
 * Attach a {@link SpendControls} configuration to an `x402Client`.
 *
 * Can only be called once per client — a second call throws
 * `SpendControlError` (`code: "already_applied"`) to prevent accidentally
 * double-counting spend.
 *
 * @param client - The client to attach controls to.
 * @param controls - The configuration to apply. May be empty (`{}`), in which
 *   case no caps are enforced and all payments are allowed.
 * @returns A frozen snapshot of the resolved configuration.
 * @throws {SpendControlError} `"already_applied"` when called a second time
 *   on the same client; `"amount_unparseable"` when `maxCumulativeSpend` is
 *   missing `asset` (each asset uses different base units, so a cross-asset
 *   total would be meaningless).
 *
 * @example
 * ```ts
 * import { x402Client } from "@x402/core/client";
 * import { applySpendControls } from "@coinbase/x402";
 *
 * const client = new x402Client();
 * applySpendControls(client, {
 *   maxAmountPerPayment: { atomic: 2_000_000n, asset: "0x036cbd…" },
 *   maxCumulativeSpend: { atomic: 10_000_000n, asset: "0x036cbd…" },
 *   maxCumulativeSpendWindow: "24h",
 *   allowedNetworks: ["eip155:84532"],
 *   onApproachingLimit: (spent, limit) => log.warn("approaching", spent, limit),
 * });
 * ```
 */
export function applySpendControls(
  client: x402Client,
  controls: SpendControls,
): ResolvedSpendControls {
  const taggedClient = client as unknown as Record<symbol, unknown>;
  if (taggedClient[APPLIED_MARKER]) {
    throw new SpendControlError(
      "already_applied",
      "applySpendControls() was called more than once on the same x402Client. " +
        "Each client must have exactly one set of spend controls.",
    );
  }

  const maxAmountPerPayment = controls.maxAmountPerPayment
    ? parseAmount(controls.maxAmountPerPayment.atomic, controls.maxAmountPerPayment.asset)
    : undefined;
  const maxCumulativeSpend = controls.maxCumulativeSpend
    ? parseAmount(controls.maxCumulativeSpend.atomic, controls.maxCumulativeSpend.asset)
    : undefined;
  const maxCumulativeSpendWindowMs =
    controls.maxCumulativeSpendWindow !== undefined
      ? parseDuration(controls.maxCumulativeSpendWindow)
      : undefined;

  // Each asset has different base units, so a total without an asset would be meaningless.
  if (maxCumulativeSpend && !maxCumulativeSpend.asset) {
    throw new SpendControlError(
      "amount_unparseable",
      "maxCumulativeSpend requires an `asset` — cross-asset atomic units cannot be summed. " +
        "Configure one cumulative cap per asset, or scope the cap to a single asset.",
      { input: controls.maxCumulativeSpend as unknown },
    );
  }

  const allowedNetworks = buildAllowedSet(controls.allowedNetworks, (n) => normalizeNetwork(n));
  const allowedAssets = buildAllowedSet(controls.allowedAssets, normalizeAsset);
  // Payee normalization is network-dependent, so we defer it until the policy runs.
  const rawAllowedPayees = controls.allowedPayees ?? [];
  const normalizedAllowedPayeesByNetwork = new Map<string, ReadonlySet<Address>>();

  const thresholds = dedupeThresholds(controls.approachingLimitThresholds);

  const tracker = new SpendTracker({
    maxLedgerEntries: controls.maxLedgerEntries,
    store: controls.store,
  });

  const notifiedThresholdsByAsset = new Map<string, Set<number>>();

  function getNotified(asset: string): Set<number> {
    let set = notifiedThresholdsByAsset.get(asset);
    if (!set) {
      set = new Set();
      notifiedThresholdsByAsset.set(asset, set);
    }
    return set;
  }

  /**
   * Per-payment registry of pending entries awaiting settlement
   * confirmation. Keyed by the `PaymentPayload` object reference returned
   * from `x402Client.createPaymentPayload`. WeakMap keying lets the entry
   * be garbage-collected if the caller drops the payload without
   * confirming or rolling back.
   */
  const pendingByPayload = new WeakMap<PaymentPayload, PendingPayment>();

  // Per-asset lock — ensures concurrent payments for the same asset can't
  // collectively slip past the cap. Shared when clients use the same store.
  const localAssetMutex = new Map<string, Promise<unknown>>();
  const sharedStoreKey = controls.store as object | undefined;

  /**
   * Running sum of atomic amounts for entries recorded in the tracker but not
   * yet confirmed or rolled back. When a shared store is in use, this map is
   * also shared across all `applySpendControls` calls that reference the same
   * store, so that `fireThresholdsForPayment` subtracts the combined in-flight
   * amount from the shared tracker total rather than only this client's share.
   *
   * All mutations happen inside the per-asset lock so reads and writes are
   * consistent with tracker operations.
   */
  const localProvisionalAtomicByAsset = new Map<string, bigint>();
  function getProvisionalMap(): Map<string, bigint> {
    if (!sharedStoreKey) return localProvisionalAtomicByAsset;
    let map = STORE_PROVISIONAL_ATOMIC.get(sharedStoreKey);
    if (!map) {
      map = new Map<string, bigint>();
      STORE_PROVISIONAL_ATOMIC.set(sharedStoreKey, map);
    }
    return map;
  }

  function withAssetLock<T>(asset: string, fn: () => Promise<T>): Promise<T> {
    const lockMap = sharedStoreKey ? getStoreMutex(sharedStoreKey) : localAssetMutex;
    const prev = lockMap.get(asset) ?? Promise.resolve();
    const next = prev.then(fn, fn); // run regardless of prev outcome
    // Store a no-rejection version so a failure in one section doesn't block the next.
    lockMap.set(
      asset,
      next.catch(() => {}),
    );
    return next;
  }

  const readRecordedEntry = (ctx: object): SpendLedgerEntry | undefined =>
    (ctx as Record<symbol, SpendLedgerEntry | undefined>)[RECORDED_ENTRY];
  const writeRecordedEntry = (ctx: object, entry: SpendLedgerEntry): void => {
    (ctx as Record<symbol, SpendLedgerEntry>)[RECORDED_ENTRY] = entry;
  };
  const clearRecordedEntry = (ctx: object): void => {
    delete (ctx as Record<symbol, SpendLedgerEntry | undefined>)[RECORDED_ENTRY];
  };

  // ---------------------------------------------------------------------------
  // Policy: filter PaymentRequirements by allow-lists.
  //
  // Rules are defined in evaluation order (network first, so off-network
  // options record network_not_allowed rather than a more specific error).
  // `errorPriority` is a separate concern: lower value = reported first when
  // all options are filtered out, preferring specific errors on on-network
  // options over a broad network mismatch. Add new constraints here — no
  // other branching logic needs to change.
  // ---------------------------------------------------------------------------
  const filterRules: ReadonlyArray<FilterRule> = [
    {
      code: FILTER_FAILURE_NETWORK_NOT_ALLOWED,
      message: "All payment requirements were filtered out by allowedNetworks",
      errorPriority: 2,
      check: (req) => {
        if (allowedNetworks.size === 0) return true;
        try {
          return allowedNetworks.has(normalizeNetwork(req.network));
        } catch {
          return false;
        }
      },
    },
    {
      code: FILTER_FAILURE_ASSET_NOT_ALLOWED,
      message: "All payment requirements were filtered out by allowedAssets",
      errorPriority: 0,
      check: (req) => {
        if (allowedAssets.size === 0) return true;
        return allowedAssets.has(normalizeAsset(req.asset));
      },
    },
    {
      code: FILTER_FAILURE_PAYEE_NOT_ALLOWED,
      message: "All payment requirements were filtered out by allowedPayees",
      errorPriority: 1,
      check: (req) => {
        if (rawAllowedPayees.length === 0) return true;
        const normalizedPayee = normalizePayee(req.network, req.payTo);
        let canonicalReqNetwork: Network;
        try {
          canonicalReqNetwork = normalizeNetwork(req.network);
        } catch {
          return false;
        }
        let normalizedAllowList = normalizedAllowedPayeesByNetwork.get(canonicalReqNetwork);
        if (!normalizedAllowList) {
          normalizedAllowList = new Set(
            rawAllowedPayees.map((payee) => normalizePayee(canonicalReqNetwork, payee)),
          );
          normalizedAllowedPayeesByNetwork.set(canonicalReqNetwork, normalizedAllowList);
        }
        return normalizedAllowList.has(normalizedPayee);
      },
    },
  ];

  const policy: PaymentPolicy = (_x402Version, paymentRequirements) => {
    const perOptionFailures: PolicyFilterFailure[] = [];

    const filtered = paymentRequirements.filter((req) => {
      for (const rule of filterRules) {
        if (!rule.check(req)) {
          perOptionFailures.push(rule.code);
          return false;
        }
      }
      return true;
    });

    if (filtered.length === 0 && perOptionFailures.length > 0) {
      const byPriority = [...filterRules].sort((a, b) => a.errorPriority - b.errorPriority);
      for (const { code, message } of byPriority) {
        if (perOptionFailures.includes(code)) {
          throw new SpendControlError(code, message);
        }
      }
    }

    return filtered;
  };
  client.registerPolicy(policy);

  // ---------------------------------------------------------------------------
  // Hook: enforce per-payment + cumulative caps before signing, and record
  // the spend atomically so concurrent calls cannot race past the cap.
  // ---------------------------------------------------------------------------
  const beforeHook: BeforePaymentCreationHook = async (context) => {
    const req = context.selectedRequirements;
    const atomic = parseAtomicFromRequirement(req);
    const normalizedReqAsset = normalizeAsset(req.asset);

    if (
      maxAmountPerPayment &&
      atomic > maxAmountPerPayment.atomic &&
      assetMatches(maxAmountPerPayment.asset, req.asset)
    ) {
      throw new SpendControlError(
        "per_payment_cap",
        `Payment amount ${atomic} exceeds per-payment cap ${maxAmountPerPayment.atomic}` +
          (maxAmountPerPayment.asset ? ` for asset ${maxAmountPerPayment.asset}` : ""),
        {
          attempted: atomic.toString(),
          limit: maxAmountPerPayment.atomic.toString(),
          asset: req.asset,
          network: req.network,
          payTo: req.payTo,
        },
      );
    }

    if (maxCumulativeSpend && assetMatches(maxCumulativeSpend.asset, req.asset)) {
      const lockKey = normalizedReqAsset;
      await withAssetLock(lockKey, async () => {
        const now = Date.now();
        if (maxCumulativeSpendWindowMs !== undefined) {
          await tracker.prune(now, maxCumulativeSpendWindowMs);
        }
        const since =
          maxCumulativeSpendWindowMs !== undefined ? now - maxCumulativeSpendWindowMs : undefined;
        const total = await tracker.total({ asset: normalizedReqAsset, since });
        if (total + atomic > maxCumulativeSpend.atomic) {
          throw new SpendControlError(
            "cumulative_cap",
            `Payment of ${atomic} would push cumulative spend to ${total + atomic}, exceeding cap ${maxCumulativeSpend.atomic}` +
              (maxCumulativeSpend.asset ? ` for asset ${maxCumulativeSpend.asset}` : "") +
              (maxCumulativeSpendWindowMs ? ` within ${maxCumulativeSpendWindowMs}ms window` : ""),
            {
              attempted: (total + atomic).toString(),
              limit: maxCumulativeSpend.atomic.toString(),
              asset: req.asset,
              network: req.network,
              payTo: req.payTo,
            },
          );
        }
        // Record spend inside the same lock as the cap check so they're atomic.
        const entry = await tracker.record({
          atomicAmount: atomic,
          asset: normalizedReqAsset,
          network: req.network,
          payTo: normalizePayee(req.network, req.payTo),
        });
        writeRecordedEntry(context as unknown as object, entry);
        // Track as provisional so confirm/rollback can compute confirmed totals.
        const pMap = getProvisionalMap();
        pMap.set(normalizedReqAsset, (pMap.get(normalizedReqAsset) ?? 0n) + atomic);
      });
    }

    return undefined;
  };
  client.onBeforePaymentCreation(beforeHook);
  pinGuardrailsBeforeHookLast(client, beforeHook);

  /**
   * Edge-triggered threshold check run at settlement-confirm time.
   *
   * Computes the confirmed total from live tracker state and the
   * the provisional atomic counter (shared across clients on the same store)
   * concurrent in-flight payments that later roll back do not cause
   * false-positive threshold warnings.
   *
   * The provisional counter for this asset is decremented inside the asset
   * lock before reading the tracker total, making the "confirmed before/after"
   * arithmetic consistent even with concurrent confirm/rollback calls.
   *
   * Returns the set of thresholds that fired (for rollback tracking).
   * Notifications are best-effort — a throwing notifier is logged but does
   * not propagate.
   */
  async function fireThresholdsForPayment(
    req: PaymentRequirements,
    entry: SpendLedgerEntry,
    notifyKey: string,
  ): Promise<Set<number>> {
    const fired = new Set<number>();
    await withAssetLock(notifyKey, async () => {
      // Mark this payment as confirmed by removing it from provisional
      // tracking. Do this inside the lock so concurrent rollbacks that also
      // modify the counter see a consistent value.
      const pMap = getProvisionalMap();
      const prevProv = pMap.get(notifyKey) ?? 0n;
      pMap.set(notifyKey, prevProv >= entry.atomicAmount ? prevProv - entry.atomicAmount : 0n);

      const notify = controls.onApproachingLimit;
      if (!maxCumulativeSpend || !notify || !assetMatches(maxCumulativeSpend.asset, req.asset)) {
        return;
      }
      const limit = maxCumulativeSpend.atomic;
      if (limit <= 0n) return;

      const now = Date.now();
      if (maxCumulativeSpendWindowMs !== undefined) {
        await tracker.prune(now, maxCumulativeSpendWindowMs);
      }
      const since =
        maxCumulativeSpendWindowMs !== undefined ? now - maxCumulativeSpendWindowMs : undefined;

      const trackerTotal = await tracker.total({ asset: notifyKey, since });
      // Confirmed total after this payment = tracker total (confirmed + this
      // entry + other provisionals) minus other provisionals.
      const provisional = pMap.get(notifyKey) ?? 0n;
      const confirmedAfter = trackerTotal - provisional;
      const confirmedBefore = confirmedAfter - entry.atomicAmount;

      const notified = getNotified(notifyKey);
      for (const threshold of thresholds) {
        // Multiply to stay in integer space and avoid floating-point drift.
        const scaledThreshold = BigInt(Math.round(threshold * 1_000_000));
        const lhsBefore = confirmedBefore * 1_000_000n;
        const lhsAfterThis = confirmedAfter * 1_000_000n;
        const rhs = scaledThreshold * limit;
        const wasBelow = lhsBefore < rhs;
        const nowAtOrAbove = lhsAfterThis >= rhs;
        if (wasBelow) {
          notified.delete(threshold);
        }
        if (wasBelow && nowAtOrAbove && !notified.has(threshold)) {
          notified.add(threshold);
          fired.add(threshold);
          try {
            notify(
              { atomic: confirmedAfter, asset: req.asset },
              { atomic: limit, asset: maxCumulativeSpend.asset ?? req.asset },
            );
          } catch (e) {
            console.warn("[@coinbase/x402] onApproachingLimit threw:", e);
          }
        }
      }
    });
    return fired;
  }

  /** Remove the provisional ledger entry and reset notification state. */
  async function rollbackEntry(pending: PendingPayment): Promise<void> {
    await withAssetLock(pending.notifyKey, async () => {
      // Decrement provisional counter and remove tracker entry atomically
      // inside the lock so concurrent confirm calls reading the tracker total
      // see a consistent state.
      const pMap = getProvisionalMap();
      const prev = pMap.get(pending.notifyKey) ?? 0n;
      pMap.set(
        pending.notifyKey,
        prev >= pending.entry.atomicAmount ? prev - pending.entry.atomicAmount : 0n,
      );
      try {
        await tracker.removeEntry(pending.entry);
      } catch (e) {
        // Rollback failures are non-fatal — at worst we conservatively
        // over-count which is the safe direction for a spend cap.
        console.warn("[@coinbase/x402] SpendTracker rollback failed:", e);
      }
    });
    // Reset notified state for thresholds this payment caused to fire so a
    // successful retry can re-notify when it re-crosses them.
    if (pending.notifiedThresholds.size > 0) {
      const notified = getNotified(pending.notifyKey);
      for (const t of pending.notifiedThresholds) {
        notified.delete(t);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Hook: register the freshly-created payment payload so the settlement-
  // aware fetch wrapper can later confirm or roll back the provisional
  // record once the server's response is in.
  //
  // Threshold notifications are deferred to `confirm()` so a failed
  // settlement (e.g. server 402 after a successful payload) does not
  // produce a spurious 80%/95% warning for a payment that never happened.
  // ---------------------------------------------------------------------------
  const afterHook: AfterPaymentCreationHook = async (context) => {
    const recordedEntry = readRecordedEntry(context as unknown as object);
    clearRecordedEntry(context as unknown as object);
    if (!recordedEntry) return;
    pendingByPayload.set(context.paymentPayload, {
      entry: recordedEntry,
      notifyKey: normalizeAsset(context.selectedRequirements.asset),
      reqAsset: context.selectedRequirements.asset,
      notifiedThresholds: new Set(),
    });
  };
  client.onAfterPaymentCreation(afterHook);

  // ---------------------------------------------------------------------------
  // Hook: roll back the anticipatory record when payment *creation* itself
  // fails (e.g. the scheme client throws while signing). Settlement-stage
  // failures are handled by `rollback()` from a fetch-layer wrapper.
  // ---------------------------------------------------------------------------
  const failureHook: OnPaymentCreationFailureHook = async (context) => {
    const recordedEntry = readRecordedEntry(context as unknown as object);
    if (!recordedEntry) return undefined;
    clearRecordedEntry(context as unknown as object);
    const notifyKey = normalizeAsset((context.selectedRequirements as PaymentRequirements).asset);
    await withAssetLock(notifyKey, async () => {
      const pMap = getProvisionalMap();
      const prev = pMap.get(notifyKey) ?? 0n;
      pMap.set(
        notifyKey,
        prev >= recordedEntry.atomicAmount ? prev - recordedEntry.atomicAmount : 0n,
      );
      try {
        await tracker.removeEntry(recordedEntry);
      } catch (e) {
        console.warn("[@coinbase/x402] SpendTracker rollback failed:", e);
      }
    });
    return undefined;
  };
  client.onPaymentCreationFailure(failureHook);

  // ---------------------------------------------------------------------------
  // Public registry: settlement-aware confirm/rollback. Attached to the
  // client via a shared symbol so fetch wrappers can find it from the
  // client reference alone.
  // ---------------------------------------------------------------------------
  const registry: SpendControlsRegistry = {
    async confirm(paymentPayload) {
      const pending = pendingByPayload.get(paymentPayload);
      if (!pending) return;
      pendingByPayload.delete(paymentPayload);
      const fired = await fireThresholdsForPayment(
        {
          asset: pending.reqAsset,
          network: pending.entry.network,
        } as PaymentRequirements,
        pending.entry,
        pending.notifyKey,
      );
      pending.notifiedThresholds = fired;
    },
    async rollback(paymentPayload) {
      const pending = pendingByPayload.get(paymentPayload);
      if (!pending) return;
      pendingByPayload.delete(paymentPayload);
      await rollbackEntry(pending);
    },
  };
  (taggedClient as Record<symbol, unknown>)[SPEND_CONTROLS_REGISTRY] = registry;

  taggedClient[APPLIED_MARKER] = true;

  return Object.freeze({
    maxAmountPerPayment,
    maxCumulativeSpend,
    maxCumulativeSpendWindowMs,
    allowedNetworks,
    allowedAssets,
    allowedPayees: new Set(rawAllowedPayees.map((p) => normalizeAsset(p))),
    approachingLimitThresholds: thresholds,
    onApproachingLimit: controls.onApproachingLimit,
    tracker,
  });
}

/**
 * Returns true when the cap's asset matches the payment's asset, or when
 * the cap has no asset restriction (applies to all assets). For cumulative
 * caps, `asset` is always set at config time, so the "no restriction" branch
 * only applies to per-payment caps.
 */
function assetMatches(capAsset: string | undefined, requirementAsset: string): boolean {
  if (!capAsset) return true;
  return normalizeAsset(capAsset) === normalizeAsset(requirementAsset);
}

/**
 * Reads the payment amount from a `PaymentRequirements` as a `bigint`.
 *
 * x402 v2+ uses `amount`; v1 uses `maxAmountRequired`. Both field names are
 * checked so that a client registered for v1 networks (e.g. via
 * `registerExactEvmScheme`) works without throwing `amount_unparseable`.
 *
 * Returns `undefined` when neither field is present or parseable, allowing
 * callers to degrade gracefully instead of hard-failing on edge cases.
 */
export function tryParseAtomicFromRequirement(req: PaymentRequirements): bigint | undefined {
  // v1 requirements carry maxAmountRequired; v2+ carry amount.
  const raw =
    "amount" in req && req.amount !== undefined
      ? req.amount
      : (req as unknown as { maxAmountRequired?: string }).maxAmountRequired;
  if (raw === undefined || raw === null) return undefined;
  // x402 amounts are already in atomic (integer) form — no unit conversion is
  // needed. Viem's parseUnits converts human-readable decimals to atomic
  // integers (e.g. "1.5" USDC → 1_500_000n), which is the wrong direction
  // here since the wire value is already atomic.
  try {
    const parsed = BigInt(raw as string);
    return parsed < 0n ? undefined : parsed;
  } catch {
    return undefined;
  }
}

/**
 * Like {@link tryParseAtomicFromRequirement} but throws a
 * {@link SpendControlError} instead of returning `undefined`.
 */
function parseAtomicFromRequirement(req: PaymentRequirements): bigint {
  const raw =
    "amount" in req && req.amount !== undefined
      ? req.amount
      : (req as unknown as { maxAmountRequired?: string }).maxAmountRequired;
  let parsed: bigint;
  try {
    parsed = BigInt(raw as string);
  } catch {
    throw new SpendControlError(
      "amount_unparseable",
      `PaymentRequirements amount ${JSON.stringify(raw)} is not a valid atomic integer`,
      {
        attempted: String(raw),
        asset: req.asset,
        network: req.network,
        payTo: req.payTo,
      },
    );
  }
  if (parsed < 0n) {
    throw new SpendControlError(
      "amount_unparseable",
      `PaymentRequirements.amount ${JSON.stringify(req.amount)} must be a non-negative atomic integer`,
      {
        attempted: parsed.toString(),
        asset: req.asset,
        network: req.network,
        payTo: req.payTo,
      },
    );
  }
  return parsed;
}

function getStoreMutex(store: object): Map<string, Promise<unknown>> {
  const existing = STORE_ASSET_MUTEX.get(store);
  if (existing) return existing;
  const created = new Map<string, Promise<unknown>>();
  STORE_ASSET_MUTEX.set(store, created);
  return created;
}

/**
 * Look up the settlement-aware {@link SpendControlsRegistry} attached to an
 * `x402Client` by {@link applySpendControls}. Returns `undefined` when the
 * client has no spend controls applied (in which case confirm/rollback are
 * meaningless no-ops).
 *
 * @internal
 */
export function getSpendControlsRegistry(client: x402Client): SpendControlsRegistry | undefined {
  const tagged = client as unknown as Record<symbol, SpendControlsRegistry | undefined>;
  return tagged[SPEND_CONTROLS_REGISTRY];
}
