/**
 * x402 support for the CDP SDK.
 *
 * Import from `@coinbase/cdp-sdk/x402` to access the CDP-managed x402 client,
 * facilitator factory, spend controls, and signer adapters.
 *
 * ## Quick start
 *
 * ### Pay for an x402-protected API (CDP Dev)
 *
 * ```typescript
 * import { CdpX402Client } from "@coinbase/cdp-sdk/x402";
 * import { wrapFetchWithPayment } from "@x402/fetch";
 *
 * // Set: CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET
 * const client = new CdpX402Client();
 * const fetchWithPayment = wrapFetchWithPayment(fetch, client);
 * const response = await fetchWithPayment("https://api.example.com/report");
 * ```
 *
 * ### Use a CDP-managed wallet with an existing x402Client (x402 Dev)
 *
 * ```typescript
 * import { CdpClient } from "@coinbase/cdp-sdk";
 * import { x402Client } from "@x402/core/client";
 * import { ExactEvmScheme } from "@x402/evm/exact/client";
 * import { fromCdpEvmAccount } from "@coinbase/cdp-sdk/x402";
 *
 * const cdp = new CdpClient();
 * const account = await cdp.evm.getOrCreateAccount({ name: "my-signer" });
 *
 * const client = new x402Client();
 * client.register("eip155:*", new ExactEvmScheme(fromCdpEvmAccount(account)));
 * ```
 *
 * @module
 */

// Main client
export { CdpX402Client, createCdpX402Client } from "./client.js";
export type { CdpX402ClientConfig, CdpX402ClientResult, WalletConfig } from "./client.js";

// Facilitator
export { createCdpFacilitatorClient, CDP_FACILITATOR_URL } from "./facilitator.js";
export type { CdpFacilitatorClientArgs } from "./facilitator.js";

// Spend controls
export { applySpendControls, getSpendControlsRegistry } from "./guardrails/apply.js";
export type { SpendControlsRegistry, ResolvedSpendControls } from "./guardrails/apply.js";
export { wrapFetchWithPayment } from "./guardrails/wrap-fetch.js";
export {
  SpendControlError,
  SpendControlErrorCodes,
  parseDuration,
  parseAmount,
} from "./guardrails/types.js";
export type {
  SpendControls,
  SpendLedgerEntry,
  SpendStore,
  Amount,
  Duration,
  Asset,
  Address,
  SpendControlErrorCode,
  SpendControlErrorDetails,
} from "./guardrails/types.js";
export { SpendTracker } from "./guardrails/spend-tracker.js";
export type {
  SpendTrackerOptions,
  RecordSpendInput,
  TotalSpendQuery,
} from "./guardrails/spend-tracker.js";
export { normalizeAsset, normalizeNetwork, normalizePayee } from "./guardrails/normalize.js";

// Balance check
export { InsufficientFundsError, createBalanceCheckHook } from "./balance-check.js";

// Signer adapters (for x402 Dev migration)
export {
  fromCdpEvmAccount,
  fromCdpSmartWallet,
  cdpSolanaAccountToSvmSigner,
} from "./account-signers.js";
export type { CdpEvmAccount, CdpSmartAccount, CdpSolanaAccount } from "./account-signers.js";

// Constants
export { CDP_EVM_RPC_URLS } from "./constants.js";
