/**
 * Public exports for the spend controls layer.
 *
 * Import from `@coinbase/x402/guardrails` directly when managing your own
 * `x402Client`, or from `@coinbase/x402` for the top-level SDK surface.
 *
 * @packageDocumentation
 */
export { SpendControlError, SpendControlErrorCodes, parseAmount, parseDuration } from "./types.js";
export type {
  Address,
  Amount,
  Asset,
  Duration,
  SpendControlErrorCode,
  SpendControlErrorDetails,
  SpendControls,
  SpendLedgerEntry,
  SpendStore,
} from "./types.js";

export { normalizeAsset, normalizeNetwork, normalizePayee } from "./normalize.js";

export { SpendTracker, DEFAULT_MAX_LEDGER_ENTRIES } from "./spend-tracker.js";
export type { SpendTrackerOptions, RecordSpendInput, TotalSpendQuery } from "./spend-tracker.js";

export {
  applySpendControls,
  DEFAULT_APPROACHING_LIMIT_THRESHOLDS,
  getSpendControlsRegistry,
  SPEND_CONTROLS_REGISTRY,
} from "./apply.js";
export type { ResolvedSpendControls, SpendControlsRegistry } from "./apply.js";

export { wrapFetchWithPayment } from "./wrap-fetch.js";
