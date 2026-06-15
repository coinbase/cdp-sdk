/**
 * @coinbase/cdp-sdk/x402 — x402 payment protocol integration for the CDP SDK.
 *
 * Provides everything needed to make and serve paid HTTP requests using
 * CDP wallets and the CDP hosted facilitator.
 *
 * @example
 * ```typescript
 * import { CdpClient } from "@coinbase/cdp-sdk";
 * import { createX402Client, createCdpFacilitatorClient, toX402Signer } from "@coinbase/cdp-sdk/x402";
 * ```
 *
 * @packageDocumentation
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
  findSmartAccountByOwner,
  toX402Signer,
} from "./wallets/index.js";
export type {
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
  CDP_EVM_RPC_URLS,
} from "./facilitator/index.js";
export type {
  FacilitatorAuthHeaders,
  FacilitatorCredentials,
  CdpFacilitatorClientArgs,
  CdpFacilitatorNetwork,
  CdpUsdcNetwork,
  CdpUsdcAddress,
} from "./facilitator/index.js";

export { SDK_METADATA } from "./constants.js";

export { resolveCredentials } from "./credentials/index.js";
export type { CdpX402ClientConfig, ResolvedCdpCredentials } from "./credentials/index.js";

export { createCdpBazaarClient } from "./bazaar/index.js";
export type {
  CdpBazaarClient,
  CdpBazaarClientArgs,
  X402SearchResourcesResponseSearchMethod,
  X402SearchResourcesResponse,
  X402ResourceQuality,
  X402DiscoveryResource,
  X402DiscoveryResourceType,
  X402DiscoveryResourcesResponse,
  X402DiscoveryMerchantResponse,
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

// Networks registry (CAIP-2 ids, USDC addresses, chainId maps)
export {
  baseMainnetCaip2,
  baseSepoliaCaip2,
  polygonCaip2,
  arbitrumCaip2,
  worldCaip2,
  worldSepoliaCaip2,
  solanaMainnetCaip2,
  solanaDevnetCaip2,
  USDC_MAINNET_MINT_ADDRESS,
  USDC_DEVNET_MINT_ADDRESS,
  CHAIN_ID_TO_CDP_NETWORK,
  NETWORK_TO_CHAIN_MAP,
  resolveNetworkToChain,
  mapChainToNetwork,
} from "../networks/index.js";
