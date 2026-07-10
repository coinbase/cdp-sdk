/**
 * x402 support for the CDP SDK.
 *
 * Import from `@coinbase/cdp-sdk/x402` to access:
 * - **Resource server**: `createX402Server` — add x402 payment gating to HTTP endpoints
 * - **Payment client**: `CdpX402Client` — pay for x402-protected APIs
 * - **Facilitator**: `createCdpFacilitatorClient` — CDP-hosted payment facilitator
 * - **Spend controls**: guardrails for autonomous agents
 * - **Signer adapters**: bridge CDP accounts into existing x402 setups
 *
 * ## Quick start
 *
 * ### Gate an endpoint
 *
 * ```typescript
 * import { createX402Server } from "@coinbase/cdp-sdk/x402";
 * import { paymentMiddlewareFromHTTPServer } from "@x402/express";
 *
 * // Set: CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET
 * const server = await createX402Server({
 *   routes: { "GET /report": { price: "$0.01", description: "AI-generated report" } },
 * });
 * app.use(paymentMiddlewareFromHTTPServer(server));
 * console.log("Receiving EVM payments at", server.payToEvmAddress);
 * ```
 *
 * ### Pay for an x402-protected API
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
 * ### Use a CDP-managed wallet with an existing x402Client
 *
 * ```typescript
 * import { CdpClient } from "@coinbase/cdp-sdk";
 * import { x402Client } from "@x402/core/client";
 * import { registerExactEvmScheme } from "@x402/evm/exact/client";
 * import { fromCdpEvmAccount } from "@coinbase/cdp-sdk/x402";
 *
 * const cdp = new CdpClient();
 * const account = await cdp.evm.getOrCreateAccount({ name: "my-signer" });
 *
 * const client = new x402Client();
 * registerExactEvmScheme(client, { signer: fromCdpEvmAccount(account) });
 * ```
 *
 * @module
 */

// Resource server
export {
  createX402Server,
  X402Server,
  CDP_SERVER_DEFAULT_EVM_NETWORKS,
  CDP_SERVER_DEFAULT_SVM_NETWORKS,
  CDP_SERVER_DEFAULT_NETWORKS,
  CDP_SERVER_DEVELOPMENT_EVM_NETWORKS,
  CDP_SERVER_DEVELOPMENT_SVM_NETWORKS,
  CDP_SERVER_DEVELOPMENT_NETWORKS,
} from "./server.js";
export type {
  CdpX402ServerConfig,
  CdpRouteConfig,
  CdpPaymentScheme,
  PayToConfig,
  RoutesConfig,
  RouteConfig,
} from "./server.js";
export {
  getCdpDefaultSchemes,
  getCdpBatchSettlementScheme,
  getCdpExtensionRegistrations,
  CDP_EXTENSION_GAS_SPONSORING_EIP2612,
  CDP_EXTENSION_GAS_SPONSORING_ERC20_APPROVAL,
  CDP_EXTENSION_BAZAAR,
  CDP_SUPPORTED_EXTENSIONS,
  buildBazaarDeclaration,
} from "./server-extensions.js";
export type { CdpSchemeRegistration } from "./server-extensions.js";

// Main client
export { CdpX402Client } from "./client.js";
export type { CdpX402ClientConfig, CdpX402WalletAddresses, WalletConfig } from "./client.js";

// Facilitator
export { createCdpFacilitatorClient, CDP_FACILITATOR_URL } from "./facilitator.js";
export type { CdpFacilitatorClientArgs } from "./facilitator.js";

// Spend controls
export { applySpendControls, getSpendControlsRegistry } from "./guardrails/apply.js";
export type { SpendControlsRegistry, ResolvedSpendControls } from "./guardrails/apply.js";
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

// Signer adapters (for x402 Dev migration)
export {
  fromCdpEvmAccount,
  fromCdpSmartWallet,
  cdpSolanaAccountToSvmSigner,
} from "./account-signers.js";
export type { CdpEvmAccount, CdpSmartAccount, CdpSolanaAccount } from "./account-signers.js";

// Constants
export { getDefaultEvmRpcUrls } from "./constants.js";
