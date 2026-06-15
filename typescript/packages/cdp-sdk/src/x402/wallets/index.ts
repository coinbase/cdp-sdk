/**
 * CDP wallet adapters for the x402 payment protocol.
 *
 * @packageDocumentation
 */

import { fromCdpEvmAccount } from "./evm-signer.js";
import { fromCdpSmartWallet } from "./scw-signer.js";
import { cdpSolanaAccountToSvmSigner } from "./svm-signer.js";

import type { EvmServerAccount, EvmSmartAccount } from "../../accounts/evm/types.js";
import type { SolanaAccount } from "../../accounts/solana/types.js";
import type { TransactionSigner } from "@solana/kit";
import type { ClientEvmSigner } from "@x402/evm";

export { fromCdpEvmAccount } from "./evm-signer.js";

export {
  fromCdpSmartWallet,
  cdpSmartAccountToEvmSigner,
  resolveNetworkFromChainId,
} from "./scw-signer.js";

export { cdpSolanaAccountToSvmSigner } from "./svm-signer.js";

export { resolveWalletConfig } from "./config.js";
export type { WalletType, WalletConfig, ResolvedWalletConfig } from "./config.js";

export { provisionCdpAccounts, findSmartAccountByOwner } from "./provision.js";
export type { CdpAccountProvisionResult } from "./provision.js";

/**
 * Converts a CDP account into the appropriate x402-compatible signer.
 *
 * This is the canonical single-entry-point adapter. Pass any CDP account type
 * and receive the right signer for x402.
 *
 * @param account
 * @example
 * ```typescript
 * import { toX402Signer } from "@coinbase/cdp-sdk/x402";
 *
 * // EVM server account (EOA)
 * const evmAccount = await cdpClient.evm.getOrCreateAccount({ name: "wallet" });
 * const evmSigner = toX402Signer(evmAccount);
 *
 * // EVM smart account
 * const smartAccount = await cdpClient.evm.getOrCreateSmartAccount({ name: "scw", owner });
 * const scwSigner = toX402Signer(smartAccount);
 *
 * // Solana account
 * const solanaAccount = await cdpClient.solana.getOrCreateAccount({ name: "sol-wallet" });
 * const svmSigner = toX402Signer(solanaAccount);
 * ```
 */
export function toX402Signer(account: EvmServerAccount): ClientEvmSigner;
export function toX402Signer(account: EvmSmartAccount): ClientEvmSigner;
export function toX402Signer(account: SolanaAccount): TransactionSigner;
/**
 *
 * @param account
 */
export function toX402Signer(
  account: EvmServerAccount | EvmSmartAccount | SolanaAccount,
): ClientEvmSigner | TransactionSigner {
  if ("address" in account && typeof (account as EvmServerAccount).signMessage === "function") {
    if ("type" in account && (account as EvmServerAccount).type === "evm-server") {
      return fromCdpEvmAccount(account as EvmServerAccount);
    }
    if ("type" in account && (account as EvmSmartAccount).type === "evm-smart") {
      return fromCdpSmartWallet(account as EvmSmartAccount);
    }
  }
  return cdpSolanaAccountToSvmSigner(account as SolanaAccount);
}
