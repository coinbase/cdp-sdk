/*
 * Wires a SpendControls configuration onto an upstream x402Client.
 */

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

import type {
  AfterPaymentCreationHook,
  BeforePaymentCreationHook,
  OnPaymentCreationFailureHook,
  OnPaymentResponseHook,
  PaymentPolicy,
  x402Client,
} from "@x402/core/client";
import type { Network, PaymentPayload, PaymentRequirements } from "@x402/core/types";

/** Default thresholds (as fractions of the cap) for `onApproachingLimit`. */
export const DEFAULT_APPROACHING_LIMIT_THRESHOLDS: readonly number[] = [0.8, 0.95];

const STORE_ASSET_MUTEX = new WeakMap<object, Map<string, Promise<unknown>>>();
const STORE_PROVISIONAL_ATOMIC = new WeakMap<object, Map<string, bigint>>();
const APPLIED_MARKER = Symbol.for("@coinbase/cdp-sdk/x402/spend-controls/applied");
const RECORDED_ENTRY = Symbol("@coinbase/cdp-sdk/x402/spend-controls/recorded-entry");

/**
 * Symbol-keyed property on a client that carries its settlement-aware confirm/rollback registry.
 */
export const SPEND_CONTROLS_REGISTRY = Symbol.for("@coinbase/cdp-sdk/x402/spend-controls/registry");

type PendingPayment = {
  entry: SpendLedgerEntry;
  notifyKey: string;
  reqAsset: string;
  notifiedThresholds: Set<number>;
};

/**
 * Settlement-aware finalization handlers attached to a client by {@link applySpendControls}.
 */
export interface SpendControlsRegistry {
  /**
   * Mark a previously-created payment as settled on-chain.
   *
   * @param paymentPayload - The payment payload to confirm.
   */
  confirm(paymentPayload: PaymentPayload): Promise<void>;
  /**
   * Undo a previously-recorded provisional spend after the payment did not settle.
   *
   * @param paymentPayload - The payment payload to roll back.
   */
  rollback(paymentPayload: PaymentPayload): Promise<void>;
}

/**
 * The active spend controls configuration after defaults are filled in.
 */
export type ResolvedSpendControls = Readonly<{
  maxAmountPerPayment?: { atomic: bigint; asset?: string };
  maxCumulativeSpend?: { atomic: bigint; asset?: string };
  maxCumulativeSpendWindowMs?: number;
  allowedNetworks: ReadonlySet<Network>;
  allowedAssets: ReadonlySet<Asset>;
  allowedPayees: ReadonlySet<Address>;
  approachingLimitThresholds: ReadonlyArray<number>;
  onApproachingLimit?: (spent: Amount, limit: Amount) => void;
  tracker: SpendTracker;
}>;

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
  readonly errorPriority: number;
  readonly check: (req: PaymentRequirements) => boolean;
};

const pinGuardrailsBeforeHookLast = (
  client: x402Client,
  guardrailsHook: BeforePaymentCreationHook,
): void => {
  /*
   * Access the internal hooks array to keep the spend-controls hook last so that
   * any subsequently registered hooks (e.g. balance check) run before our cap check.
   * This relies on x402Client's private `beforePaymentCreationHooks` array name.
   * If @x402/core renames that field we can no longer guarantee ordering; the
   * spend-control hook still fires (it is already registered), just not
   * necessarily last, so we warn rather than fail. The characterization test in
   * apply.test.ts pins this assumption and turns an upstream rename into a red
   * test at dependency-bump time.
   */
  type WithHookArray = { beforePaymentCreationHooks?: BeforePaymentCreationHook[] };
  const hooks = (client as unknown as WithHookArray).beforePaymentCreationHooks;
  if (!Array.isArray(hooks)) {
    // eslint-disable-next-line no-console
    console.warn(
      "[@coinbase/cdp-sdk/x402] Unable to pin the spend-control hook last: the x402Client no " +
        "longer exposes its `beforePaymentCreationHooks` array (likely an incompatible @x402/core " +
        "version). Spend controls remain active, but may not run after other before-payment hooks.",
    );
    return;
  }

  const original = client.onBeforePaymentCreation.bind(client);
  (client as unknown as { onBeforePaymentCreation: unknown }).onBeforePaymentCreation = (
    hook: BeforePaymentCreationHook,
  ): x402Client => {
    const idx = hooks.indexOf(guardrailsHook);
    if (idx === -1) return original(hook);
    hooks.splice(idx, 0, hook);
    return client;
  };
};

const buildAllowedSet = <T extends string>(
  values: T[] | undefined,
  normalize: (value: T) => T,
): ReadonlySet<T> => {
  if (!values || values.length === 0) return new Set();
  return new Set(values.map(normalize));
};

const dedupeThresholds = (thresholds: number[] | undefined): number[] => {
  const fallback = DEFAULT_APPROACHING_LIMIT_THRESHOLDS;
  const source = thresholds && thresholds.length > 0 ? thresholds : fallback;
  return Array.from(new Set(source.filter(t => Number.isFinite(t) && t > 0 && t <= 1))).sort(
    (a, b) => a - b,
  );
};

const assetMatches = (capAsset: string | undefined, requirementAsset: string): boolean => {
  if (!capAsset) return true;
  return normalizeAsset(capAsset) === normalizeAsset(requirementAsset);
};

const getStoreMutex = (store: object): Map<string, Promise<unknown>> => {
  const existing = STORE_ASSET_MUTEX.get(store);
  if (existing) return existing;
  const created = new Map<string, Promise<unknown>>();
  STORE_ASSET_MUTEX.set(store, created);
  return created;
};

const parseAtomicFromRequirement = (req: PaymentRequirements): bigint => {
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
};

/**
 * Attach a {@link SpendControls} configuration to an `x402Client`.
 *
 * Can only be called once per client — a second call throws
 * `SpendControlError` (`code: "already_applied"`).
 *
 * @param client - The client to attach controls to.
 * @param controls - The spend controls configuration to apply.
 * @returns A frozen snapshot of the resolved configuration.
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

  if (maxCumulativeSpend && !maxCumulativeSpend.asset) {
    throw new SpendControlError(
      "amount_unparseable",
      "maxCumulativeSpend requires an `asset` — cross-asset atomic units cannot be summed.",
      { input: controls.maxCumulativeSpend as unknown },
    );
  }

  const allowedNetworks = buildAllowedSet(controls.allowedNetworks, n => normalizeNetwork(n));
  const allowedAssets = buildAllowedSet(controls.allowedAssets, normalizeAsset);
  const rawAllowedPayees = controls.allowedPayees ?? [];
  const normalizedAllowedPayeesByNetwork = new Map<string, ReadonlySet<Address>>();

  const thresholds = dedupeThresholds(controls.approachingLimitThresholds);

  const tracker = new SpendTracker({
    maxLedgerEntries: controls.maxLedgerEntries,
    store: controls.store,
  });

  const notifiedThresholdsByAsset = new Map<string, Set<number>>();

  const getNotified = (asset: string): Set<number> => {
    let set = notifiedThresholdsByAsset.get(asset);
    if (!set) {
      set = new Set();
      notifiedThresholdsByAsset.set(asset, set);
    }
    return set;
  };

  /*
   * Dual-lookup structure for pending payments.
   *
   * `pendingByPayload` is the primary fast path keyed on object identity.
   * `pendingByFingerprint` is the fallback keyed on payload content — it
   * handles the case where a transport or wrapper clones the payload object
   * before passing it back through `onPaymentResponse` (e.g. JSON round-trip,
   * shallow spread). Without this, rollback/confirm would silently no-op on
   * a cloned payload, leaving provisional spend permanently over-counted.
   *
   * A fingerprint is built from the canonically serialized `accepted`
   * requirements and `payload` content. In production, x402 signatures always
   * include a nonce (EIP-3009 nonce / Solana blockhash), so two independent
   * payment operations for the same amount will produce distinct fingerprints.
   * The queue handles the rare edge case of identical fingerprints gracefully
   * by popping the oldest entry first.
   */
  const pendingByPayload = new WeakMap<PaymentPayload, PendingPayment>();
  const pendingByFingerprint = new Map<string, PendingPayment[]>();

  const buildPayloadFingerprint = (p: PaymentPayload): string | null => {
    try {
      return JSON.stringify({ accepted: p.accepted, payload: p.payload });
    } catch {
      return null;
    }
  };

  const registerPending = (paymentPayload: PaymentPayload, pending: PendingPayment): void => {
    pendingByPayload.set(paymentPayload, pending);
    const fp = buildPayloadFingerprint(paymentPayload);
    if (fp === null) return;
    const queue = pendingByFingerprint.get(fp);
    if (queue) {
      queue.push(pending);
    } else {
      pendingByFingerprint.set(fp, [pending]);
    }
  };

  const lookupPending = (paymentPayload: PaymentPayload): PendingPayment | undefined => {
    const byIdentity = pendingByPayload.get(paymentPayload);
    if (byIdentity !== undefined) return byIdentity;
    const fp = buildPayloadFingerprint(paymentPayload);
    if (fp === null) return undefined;
    return pendingByFingerprint.get(fp)?.[0];
  };

  const unregisterPending = (paymentPayload: PaymentPayload, pending: PendingPayment): void => {
    pendingByPayload.delete(paymentPayload);
    const fp = buildPayloadFingerprint(paymentPayload);
    if (fp === null) return;
    const queue = pendingByFingerprint.get(fp);
    if (!queue) return;
    const idx = queue.indexOf(pending);
    if (idx >= 0) queue.splice(idx, 1);
    if (queue.length === 0) pendingByFingerprint.delete(fp);
  };

  const localAssetMutex = new Map<string, Promise<unknown>>();
  const sharedStoreKey = controls.store as object | undefined;
  const localProvisionalAtomicByAsset = new Map<string, bigint>();

  const getProvisionalMap = (): Map<string, bigint> => {
    if (!sharedStoreKey) return localProvisionalAtomicByAsset;
    let map = STORE_PROVISIONAL_ATOMIC.get(sharedStoreKey);
    if (!map) {
      map = new Map<string, bigint>();
      STORE_PROVISIONAL_ATOMIC.set(sharedStoreKey, map);
    }
    return map;
  };

  const withAssetLock = <T>(asset: string, fn: () => Promise<T>): Promise<T> => {
    const lockMap = sharedStoreKey ? getStoreMutex(sharedStoreKey) : localAssetMutex;
    const prev = lockMap.get(asset) ?? Promise.resolve();
    const next = prev.then(fn, fn);
    lockMap.set(
      asset,
      next.catch(() => {}),
    );
    return next;
  };

  const readRecordedEntry = (ctx: object): SpendLedgerEntry | undefined =>
    (ctx as Record<symbol, SpendLedgerEntry | undefined>)[RECORDED_ENTRY];
  const writeRecordedEntry = (ctx: object, entry: SpendLedgerEntry): void => {
    (ctx as Record<symbol, SpendLedgerEntry>)[RECORDED_ENTRY] = entry;
  };
  const clearRecordedEntry = (ctx: object): void => {
    delete (ctx as Record<symbol, SpendLedgerEntry | undefined>)[RECORDED_ENTRY];
  };

  const filterRules: ReadonlyArray<FilterRule> = [
    {
      code: FILTER_FAILURE_NETWORK_NOT_ALLOWED,
      message: "All payment requirements were filtered out by allowedNetworks",
      errorPriority: 2,
      check: req => {
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
      check: req => {
        if (allowedAssets.size === 0) return true;
        return allowedAssets.has(normalizeAsset(req.asset));
      },
    },
    {
      code: FILTER_FAILURE_PAYEE_NOT_ALLOWED,
      message: "All payment requirements were filtered out by allowedPayees",
      errorPriority: 1,
      check: req => {
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
            rawAllowedPayees.map(payee => normalizePayee(canonicalReqNetwork, payee)),
          );
          normalizedAllowedPayeesByNetwork.set(canonicalReqNetwork, normalizedAllowList);
        }
        return normalizedAllowList.has(normalizedPayee);
      },
    },
  ];

  const policy: PaymentPolicy = (_x402Version, paymentRequirements) => {
    const perOptionFailures: PolicyFilterFailure[] = [];

    const filtered = paymentRequirements.filter(req => {
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

  const beforeHook: BeforePaymentCreationHook = async context => {
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
        const entry = await tracker.record({
          atomicAmount: atomic,
          asset: normalizedReqAsset,
          network: req.network,
          payTo: normalizePayee(req.network, req.payTo),
        });
        writeRecordedEntry(context as unknown as object, entry);
        const pMap = getProvisionalMap();
        pMap.set(normalizedReqAsset, (pMap.get(normalizedReqAsset) ?? 0n) + atomic);
      });
    }

    return undefined;
  };
  client.onBeforePaymentCreation(beforeHook);
  pinGuardrailsBeforeHookLast(client, beforeHook);

  const fireThresholdsForPayment = async (
    req: PaymentRequirements,
    entry: SpendLedgerEntry,
    notifyKey: string,
  ): Promise<Set<number>> => {
    const fired = new Set<number>();
    await withAssetLock(notifyKey, async () => {
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
      const provisional = pMap.get(notifyKey) ?? 0n;
      const confirmedAfter = trackerTotal - provisional;
      const confirmedBefore = confirmedAfter - entry.atomicAmount;

      const notified = getNotified(notifyKey);
      for (const threshold of thresholds) {
        const scaledThreshold = BigInt(Math.round(threshold * 1_000_000));
        const lhsBefore = confirmedBefore * 1_000_000n;
        const lhsAfterThis = confirmedAfter * 1_000_000n;
        const rhs = scaledThreshold * limit;
        const wasBelow = lhsBefore < rhs;
        const nowAtOrAbove = lhsAfterThis >= rhs;
        if (wasBelow) notified.delete(threshold);
        if (wasBelow && nowAtOrAbove && !notified.has(threshold)) {
          notified.add(threshold);
          fired.add(threshold);
          try {
            notify(
              { atomic: confirmedAfter, asset: req.asset },
              { atomic: limit, asset: maxCumulativeSpend.asset ?? req.asset },
            );
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn("[@coinbase/cdp-sdk/x402] onApproachingLimit threw:", e);
          }
        }
      }
    });
    return fired;
  };

  const rollbackEntry = async (pending: PendingPayment): Promise<void> => {
    await withAssetLock(pending.notifyKey, async () => {
      const pMap = getProvisionalMap();
      const prev = pMap.get(pending.notifyKey) ?? 0n;
      pMap.set(
        pending.notifyKey,
        prev >= pending.entry.atomicAmount ? prev - pending.entry.atomicAmount : 0n,
      );
      try {
        await tracker.removeEntry(pending.entry);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("[@coinbase/cdp-sdk/x402] SpendTracker rollback failed:", e);
      }
    });
    if (pending.notifiedThresholds.size > 0) {
      const notified = getNotified(pending.notifyKey);
      for (const t of pending.notifiedThresholds) {
        notified.delete(t);
      }
    }
  };

  const afterHook: AfterPaymentCreationHook = async context => {
    const recordedEntry = readRecordedEntry(context as unknown as object);
    clearRecordedEntry(context as unknown as object);
    if (!recordedEntry) return;
    registerPending(context.paymentPayload, {
      entry: recordedEntry,
      notifyKey: normalizeAsset(context.selectedRequirements.asset),
      reqAsset: context.selectedRequirements.asset,
      notifiedThresholds: new Set(),
    });
  };
  client.onAfterPaymentCreation(afterHook);

  const failureHook: OnPaymentCreationFailureHook = async context => {
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
        // eslint-disable-next-line no-console
        console.warn("[@coinbase/cdp-sdk/x402] SpendTracker rollback failed:", e);
      }
    });
    return undefined;
  };
  client.onPaymentCreationFailure(failureHook);

  const registry: SpendControlsRegistry = {
    async confirm(paymentPayload) {
      const pending = lookupPending(paymentPayload);
      if (!pending) return;
      unregisterPending(paymentPayload, pending);
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
      const pending = lookupPending(paymentPayload);
      if (!pending) return;
      unregisterPending(paymentPayload, pending);
      await rollbackEntry(pending);
    },
  };
  (taggedClient as Record<symbol, unknown>)[SPEND_CONTROLS_REGISTRY] = registry;

  /*
   * Wire settlement finalization into the standard onPaymentResponse hook so
   * upstream wrappers like @x402/fetch automatically confirm or roll back
   * provisional spend entries — no SDK-owned fetch wrapper required.
   *
   * Settlement decision:
   *   - settleResponse.success === true  → confirmed on-chain, keep the spend
   *   - settleResponse.success === false → settlement failed, roll back
   *   - paymentRequired present          → verify failed (got 402 back), roll back
   *   - otherwise (ambiguous)            → no settlement header and no follow-up
   *     402, OR a transport/parse error (ctx.error) after the payment header was
   *     sent. The on-chain outcome is unknown, so we KEEP the spend (fail-closed
   *     for the budget): we would rather over-count and block a future payment
   *     than risk under-counting and exceeding the configured cap. Callers that
   *     need stronger guarantees should enforce caps with an authoritative,
   *     durable backend (see SpendControls.store) or a server-side policy.
   */
  const paymentResponseHook: OnPaymentResponseHook = async ctx => {
    if (ctx.settleResponse?.success === true) {
      await registry.confirm(ctx.paymentPayload);
    } else if (ctx.settleResponse !== undefined || ctx.paymentRequired !== undefined) {
      await registry.rollback(ctx.paymentPayload);
    } else {
      // Ambiguous settlement (including ctx.error): keep the spend (fail-closed).
      await registry.confirm(ctx.paymentPayload);
    }
  };
  client.onPaymentResponse(paymentResponseHook);

  taggedClient[APPLIED_MARKER] = true;

  return Object.freeze({
    maxAmountPerPayment,
    maxCumulativeSpend,
    maxCumulativeSpendWindowMs,
    allowedNetworks,
    allowedAssets,
    /*
     * The snapshot returns trimmed raw payee strings. Actual enforcement uses
     * normalizePayee() per-network at check time (see the filterRules payee check above).
     */
    allowedPayees: new Set(rawAllowedPayees.map(p => p.trim())),
    approachingLimitThresholds: thresholds,
    onApproachingLimit: controls.onApproachingLimit,
    tracker,
  });
}

/**
 * Look up the settlement-aware {@link SpendControlsRegistry} attached to an
 * `x402Client` by {@link applySpendControls}.
 *
 * @param client - The x402Client to look up the registry for.
 * @returns The registry, or undefined if spend controls were not applied.
 */
export function getSpendControlsRegistry(client: x402Client): SpendControlsRegistry | undefined {
  const tagged = client as unknown as Record<symbol, SpendControlsRegistry | undefined>;
  return tagged[SPEND_CONTROLS_REGISTRY];
}
