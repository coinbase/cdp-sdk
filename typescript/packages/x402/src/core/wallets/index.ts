/**
 * CDP wallet adapters for the x402 payment protocol.
 *
 * Provides first-class adapters that bridge CDP SDK wallet types to the
 * x402 signer interfaces, removing the need to hand-roll adapters or
 * discover undocumented bridge functions.
 *
 * Two wallet backends are supported:
 *
 * **CDP Server Wallet (EOA)** — default, lowest overhead, all networks:
 * ```typescript
 * import { fromCdpEvmAccount } from "@coinbase/x402";
 * const account = await cdpClient.evm.getOrCreateAccount({ name: "my-wallet" });
 * const signer = fromCdpEvmAccount(account);
 * ```
 *
 * **CDP Smart Contract Wallet** — ERC-4337, gas sponsorship, Base/Base Sepolia:
 * ```typescript
 * import { fromCdpSmartWallet } from "@coinbase/x402";
 * const smartAccount = await cdpClient.evm.getOrCreateSmartAccount({ name, owner });
 * const signer = fromCdpSmartWallet(smartAccount);
 * ```
 * @packageDocumentation
 */

export { fromCdpEvmAccount } from "./evm-signer.js";
export type { CdpEvmAccount } from "./evm-signer.js";

export {
  fromCdpSmartWallet,
  cdpSmartAccountToEvmSigner,
  resolveNetworkFromChainId,
} from "./scw-signer.js";
export type { CdpSmartAccount } from "./scw-signer.js";

export { cdpSolanaAccountToSvmSigner } from "./svm-signer.js";
export type { CdpSolanaAccount } from "./svm-signer.js";

export { resolveWalletConfig } from "./config.js";
export type { WalletType, WalletConfig, ResolvedWalletConfig } from "./config.js";

export { provisionCdpAccounts } from "./provision.js";
export type { CdpAccountProvisionResult } from "./provision.js";
