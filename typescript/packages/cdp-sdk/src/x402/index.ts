/*
 * CDP x402 client for paying x402-protected APIs using CDP-managed wallets.
 * Import from "@coinbase/cdp-sdk/x402".
 */

export { CdpX402Client, createCdpX402Client } from "./client.js";
export type { CdpX402ClientResult } from "./client.js";

export type {
  CdpX402ClientConfig,
  WalletConfig,
  WalletType,
  ResolvedCdpCredentials,
  ResolvedWalletConfig,
} from "./credentials.js";

export { InsufficientFundsError } from "./balance-check.js";

export {
  fromCdpEvmAccount,
  fromCdpSmartWallet,
  cdpSolanaAccountToSvmSigner,
  resolveNetworkFromChainId,
} from "./wallets.js";
export type {
  CdpEvmAccount,
  CdpSmartAccount,
  CdpSolanaAccount,
  CdpAccountProvisionResult,
} from "./wallets.js";

export {
  CDP_EVM_RPC_URLS,
  CDP_USDC_ADDRESSES,
  baseMainnetCaip2,
  baseSepoliaCaip2,
  polygonCaip2,
  arbitrumCaip2,
  worldCaip2,
  worldSepoliaCaip2,
  solanaMainnetCaip2,
  solanaDevnetCaip2,
} from "./constants.js";
