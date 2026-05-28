/**
 * Core barrel for client, wallet, facilitator, and credential modules.
 */
export { CdpX402Client, createCdpX402Client } from "./client/index.js";
export type { CdpX402ClientResult } from "./client/index.js";
export { InsufficientFundsError, createBalanceCheckHook } from "./client/balance-check.js";

export {
  fromCdpEvmAccount,
  fromCdpSmartWallet,
  cdpSmartAccountToEvmSigner,
  resolveNetworkFromChainId,
  cdpSolanaAccountToSvmSigner,
  resolveWalletConfig,
  provisionCdpAccounts,
} from "./wallets/index.js";
export type {
  CdpEvmAccount,
  CdpSmartAccount,
  CdpSolanaAccount,
  WalletType,
  WalletConfig,
  ResolvedWalletConfig,
  CdpAccountProvisionResult,
} from "./wallets/index.js";

export {
  createCdpAuthHeaders,
  createCdpFacilitatorClient,
  CDP_FACILITATOR_URL,
  CDP_API_HOST,
  FACILITATOR_PATHS,
  CDP_FACILITATOR_NETWORKS,
  CDP_USDC_ADDRESSES,
} from "./facilitator/index.js";
export type {
  FacilitatorAuthHeaders,
  FacilitatorCredentials,
  CdpFacilitatorClientArgs,
} from "./facilitator/index.js";
export type {
  CdpFacilitatorNetwork,
  CdpUsdcNetwork,
  CdpUsdcAddress,
} from "./facilitator/constants.js";

export { SDK_METADATA } from "./constants.js";

export { resolveCredentials } from "./credentials/index.js";
export type { CdpX402ClientConfig, ResolvedCdpCredentials } from "./credentials/index.js";

export { createCdpBazaarClient } from "./bazaar/index.js";
export type {
  CdpBazaarClient,
  CdpBazaarClientArgs,
  X402ResourceQuality,
  X402DiscoveryResource,
  X402DiscoveryResourceType,
  X402DiscoveryResourcesResponse,
  X402DiscoveryMerchantResponse,
  X402SearchResourcesResponse,
  X402SearchResourcesResponseSearchMethod,
  ListX402DiscoveryResourcesParams,
  ListX402DiscoveryMerchantParams,
  SearchX402ResourcesParams,
} from "./bazaar/index.js";

export {
  CdpResourceServer,
  createCdpResourceServer,
  getCdpDefaultSchemes,
  CDP_SERVER_DEFAULT_EVM_NETWORKS,
  CDP_SERVER_DEFAULT_SVM_NETWORKS,
  CDP_SERVER_DEFAULT_NETWORKS,
} from "./server/index.js";
export type {
  CdpResourceServerConfig,
  CdpRouteConfig,
  CdpPaymentScheme,
  CdpSchemeRegistration,
} from "./server/index.js";

export {
  CDP_EXTENSION_GAS_SPONSORING_EIP2612,
  CDP_EXTENSION_GAS_SPONSORING_ERC20_APPROVAL,
  CDP_EXTENSION_BAZAAR,
  CDP_SUPPORTED_EXTENSIONS,
  getCdpExtensionRegistrations,
  buildBazaarDeclaration,
} from "./extensions/index.js";
export type { CdpExtensions } from "./extensions/index.js";

/**
 * Spend-controls guardrails — see `src/core/guardrails/README.md`.
 */
export {
  applySpendControls,
  getSpendControlsRegistry,
  SPEND_CONTROLS_REGISTRY,
  SpendControlError,
  SpendControlErrorCodes,
  SpendTracker,
  parseAmount,
  parseDuration,
  normalizeAsset,
  normalizeNetwork,
  normalizePayee,
  wrapFetchWithPayment,
} from "./guardrails/index.js";
export type {
  Address,
  Amount,
  Asset,
  Duration,
  ResolvedSpendControls,
  SpendControlErrorCode,
  SpendControlErrorDetails,
  SpendControls,
  SpendControlsRegistry,
  SpendLedgerEntry,
  SpendStore,
  SpendTrackerOptions,
} from "./guardrails/index.js";
