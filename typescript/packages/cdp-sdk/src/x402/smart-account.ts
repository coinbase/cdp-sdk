/**
 * Shared helpers for recovering CDP smart accounts.
 */

import type { CdpClient } from "../client/cdp.js";

/**
 * Returns `true` when the CDP API rejected a smart account creation because the
 * owner EOA already has a smart wallet registered under a different name.
 *
 * @param error - The caught error value to inspect.
 * @returns `true` if the error indicates an owner already has a smart wallet.
 */
export function isOwnerAlreadyHasSmartWalletError(error: unknown): boolean {
  return (
    error instanceof Error && error.message.includes("Multiple smart wallets with the same owner")
  );
}

/**
 * Paginates through all smart accounts in the CDP project to find one owned by
 * the given address. Used as a recovery path when `getOrCreateSmartAccount`
 * fails because the owner already has a smart wallet under a different name.
 *
 * @param cdpClient - The CDP client to use for listing accounts.
 * @param ownerAddress - Owner EOA address to match (case-insensitive).
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
