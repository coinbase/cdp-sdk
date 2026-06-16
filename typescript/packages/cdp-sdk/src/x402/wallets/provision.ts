/**
 * CDP account provisioning shared between the x402 payment client and resource server.
 */

import { type ResolvedWalletConfig } from "./config.js";
import { fromCdpEvmAccount } from "./evm-signer.js";
import { fromCdpSmartWallet } from "./scw-signer.js";
import { cdpSolanaAccountToSvmSigner } from "./svm-signer.js";
import { CdpClient } from "../../client/cdp.js";
import { type CdpX402ClientConfig, resolveCredentials } from "../credentials/index.js";

import type { TransactionSigner } from "@solana/kit";
import type { ClientEvmSigner } from "@x402/evm";

/**
 * The result of provisioning CDP accounts for use with x402.
 */
export interface CdpAccountProvisionResult {
  /** The underlying CdpClient instance for direct CDP API access. */
  cdpClient: CdpClient;
  /** EVM address for the provisioned account (EOA or SCW per walletConfig). */
  evmAddress: `0x${string}`;
  /** Solana account address. */
  svmAddress: string;
  /**
   * Owner account name. Only set when walletConfig.type is "cdp-smart".
   */
  ownerWallet?: string;
  /** x402-compatible EVM signer. */
  evmSigner: ClientEvmSigner;
  /** x402-compatible Solana transaction signer. */
  svmSigner: TransactionSigner;
}

/**
 * Finds an existing smart account by owner address, paging through all results.
 *
 * @param cdpClient - The CDP client to use for listing accounts.
 * @param ownerAddress - The owner EOA address to match (case-insensitive).
 * @returns The first matching smart account address, or `undefined` if none found.
 */
export async function findSmartAccountByOwner(
  cdpClient: CdpClient,
  ownerAddress: string,
): Promise<string | undefined> {
  const normalizedOwner = ownerAddress.toLowerCase();
  let pageToken: string | undefined;
  do {
    const result = await cdpClient.evm.listSmartAccounts({ pageToken });
    const match = result.accounts.find(a => a.owners[0]?.toLowerCase() === normalizedOwner);
    if (match) return match.address;
    pageToken = result.nextPageToken;
  } while (pageToken);
  return undefined;
}

/**
 * Provisions CDP EVM and Solana accounts and builds x402-compatible signers.
 *
 * @param config - Optional credential config. All fields fall back to env vars.
 * @param walletConfig - Resolved wallet type and account names.
 * @returns Provisioned accounts, addresses, and x402-compatible signers.
 */
export async function provisionCdpAccounts(
  config: CdpX402ClientConfig | undefined,
  walletConfig: ResolvedWalletConfig,
): Promise<CdpAccountProvisionResult> {
  const credentials = resolveCredentials(config);
  const cdpClient = new CdpClient({
    apiKeyId: credentials.apiKeyId,
    apiKeySecret: credentials.apiKeySecret,
    walletSecret: credentials.walletSecret,
  });

  const svmAccount = await cdpClient.solana.getOrCreateAccount({
    name: walletConfig.accountName,
  });

  let evmAddress: `0x${string}`;
  let ownerWallet: string | undefined;
  let evmSigner: ClientEvmSigner;

  if (walletConfig.type === "cdp-smart") {
    const ownerAccount = await cdpClient.evm.getOrCreateAccount({
      name: walletConfig.ownerAccountName!,
    });

    const smartAccount = await cdpClient.evm.getOrCreateSmartAccount({
      name: walletConfig.accountName,
      owner: ownerAccount,
    });

    evmAddress = smartAccount.address as `0x${string}`;
    ownerWallet = walletConfig.ownerAccountName!;
    evmSigner = fromCdpSmartWallet(smartAccount);
  } else {
    const evmAccount = await cdpClient.evm.getOrCreateAccount({
      name: walletConfig.accountName,
    });
    evmAddress = evmAccount.address as `0x${string}`;
    evmSigner = fromCdpEvmAccount(evmAccount);
  }

  return {
    cdpClient,
    evmAddress,
    svmAddress: svmAccount.address,
    ownerWallet,
    evmSigner,
    svmSigner: cdpSolanaAccountToSvmSigner(svmAccount),
  };
}
