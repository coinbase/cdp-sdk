/**
 * CDP account provisioning shared between the x402 payment client and resource server.
 *
 * Extracts the wallet-setup logic so the client (payer) and the server (receiver)
 * can both obtain CDP-backed EVM and Solana accounts through a single code path.
 * The client additionally registers signers on an x402Client instance; the server
 * only needs the provisioned addresses for `payTo` configuration.
 */

import { CdpClient } from "@coinbase/cdp-sdk";
import type { ClientEvmSigner } from "@x402/evm";
import type { TransactionSigner } from "@solana/kit";

import { type CdpX402ClientConfig, resolveCredentials } from "../credentials/index.js";
import { type ResolvedWalletConfig } from "./config.js";
import { fromCdpEvmAccount } from "./evm-signer.js";
import { fromCdpSmartWallet } from "./scw-signer.js";
import { cdpSolanaAccountToSvmSigner } from "./svm-signer.js";

/**
 * The result of provisioning CDP accounts for use with x402.
 *
 * The client consumes `evmSigner` and `svmSigner` to register payment schemes.
 * The server consumes `evmAddress` and `svmAddress` to populate `payTo` in routes.
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
   * The owner signs EIP-712 typed data on behalf of the smart account.
   */
  ownerWallet?: string;
  /** x402-compatible EVM signer. */
  evmSigner: ClientEvmSigner;
  /** x402-compatible Solana transaction signer. */
  svmSigner: TransactionSigner;
}

/**
 * Returns true when the CDP API rejected a smart account creation because the owner
 * already has a smart account registered under a different name.
 * CDP allows only one smart wallet per owner EOA.
 *
 * NOTE: This string match is version-dependent and may drift if the CDP SDK changes
 * its error message wording.
 */
export function isOwnerAlreadyHasSmartWalletError(error: unknown): boolean {
  return (
    error instanceof Error && error.message.includes("Multiple smart wallets with the same owner")
  );
}

/**
 * Finds an existing smart account by owner address, paging through all results.
 *
 * Used as recovery when `getOrCreateSmartAccount` fails because the owner already
 * owns a smart account registered under a different name.
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
    const match = result.accounts.find((a) => a.owners[0]?.toLowerCase() === normalizedOwner);
    if (match) return match.address;
    pageToken = result.nextPageToken;
  } while (pageToken);
  return undefined;
}

/**
 * Provisions CDP EVM and Solana accounts and builds x402-compatible signers.
 *
 * Used by both the x402 payment client (to register payment signers) and the
 * CDP resource server (to derive `payTo` addresses for route configuration).
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

    let smartAccount;
    try {
      smartAccount = await cdpClient.evm.getOrCreateSmartAccount({
        name: walletConfig.accountName,
        owner: ownerAccount,
      });
    } catch (error) {
      // CDP allows only one smart wallet per owner. If the owner already has a smart wallet
      // registered under a different name, recover by finding and using the existing one.
      if (isOwnerAlreadyHasSmartWalletError(error)) {
        const existingAddress = await findSmartAccountByOwner(cdpClient, ownerAccount.address);
        if (!existingAddress) throw error;
        smartAccount = await cdpClient.evm.getSmartAccount({
          address: existingAddress as `0x${string}`,
          owner: ownerAccount,
        });
      } else {
        throw error;
      }
    }

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
