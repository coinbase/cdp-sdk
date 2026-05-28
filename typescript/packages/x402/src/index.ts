/**
 * @coinbase/x402 — Coinbase-opinionated wrapper for the x402 payment protocol.
 *
 * Provides a streamlined setup experience for making and serving paid HTTP
 * requests using Coinbase CDP wallets and the CDP hosted facilitator.
 *
 * @example
 * ```typescript
 * // Simplest path — reads all config from env vars
 * import { CdpX402Client } from "@coinbase/x402";
 *
 * const client = new CdpX402Client();
 * const fetchWithPayment = client.wrapFetch();
 * const response = await fetchWithPayment("https://api.example.com/paid-endpoint");
 * ```
 *
 * @packageDocumentation
 */

export {
  CdpX402Client,
  createCdpX402Client,
  fromCdpEvmAccount,
  fromCdpSmartWallet,
  cdpSmartAccountToEvmSigner,
  resolveNetworkFromChainId,
  cdpSolanaAccountToSvmSigner,
  createCdpAuthHeaders,
  createCdpFacilitatorClient,
  createCdpBazaarClient,
  resolveCredentials,
  resolveWalletConfig,
  provisionCdpAccounts,
  CDP_FACILITATOR_URL,
  CDP_FACILITATOR_NETWORKS,
  CDP_USDC_ADDRESSES,
  CdpResourceServer,
  createCdpResourceServer,
  getCdpDefaultSchemes,
  CDP_SERVER_DEFAULT_EVM_NETWORKS,
  CDP_SERVER_DEFAULT_SVM_NETWORKS,
  CDP_SERVER_DEFAULT_NETWORKS,
  CDP_EXTENSION_GAS_SPONSORING_EIP2612,
  CDP_EXTENSION_GAS_SPONSORING_ERC20_APPROVAL,
  CDP_EXTENSION_BAZAAR,
  CDP_SUPPORTED_EXTENSIONS,
  getCdpExtensionRegistrations,
  buildBazaarDeclaration,
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
  InsufficientFundsError,
  createBalanceCheckHook,
} from "./core/index.js";
export type {
  CdpX402ClientResult,
  CdpEvmAccount,
  CdpSmartAccount,
  CdpSolanaAccount,
  FacilitatorAuthHeaders,
  FacilitatorCredentials,
  CdpFacilitatorClientArgs,
  CdpFacilitatorNetwork,
  CdpUsdcNetwork,
  CdpUsdcAddress,
  CdpX402ClientConfig,
  ResolvedCdpCredentials,
  WalletConfig,
  WalletType,
  ResolvedWalletConfig,
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
  CdpAccountProvisionResult,
  CdpResourceServerConfig,
  CdpRouteConfig,
  CdpPaymentScheme,
  CdpSchemeRegistration,
  CdpExtensions,
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
} from "./core/index.js";

export { x402Client } from "@x402/core/client";
export { toClientEvmSigner } from "@x402/evm";
export { x402ResourceServer, x402HTTPResourceServer } from "@x402/core/server";
export type { RoutesConfig, RouteConfig } from "@x402/core/server";
export type {
  Network,
  PaymentPayload,
  PaymentRequired,
  PaymentRequirements,
} from "@x402/core/types";
