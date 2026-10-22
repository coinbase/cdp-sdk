import { EvmUserOperationStatus } from "../../openapi-client/index.js";

import type { TransactionResult } from "./sendTransaction.js";
import type { SendUserOperationReturnType } from "./sendUserOperation.js";
import type { CdpOpenApiClientType, PaymasterContext } from "../../openapi-client/index.js";
import type { Address, Hex } from "../../types/misc.js";

/**
 * Options for redeeming the vault fee shares held by a vault's fee recipient account.
 */
export interface RedeemVaultFeesOptions {
  /** The ID of the vault to redeem fees from, e.g. `vault_019f5f10-096a-7a23-86df-f479650d813f`. */
  vaultId: string;
  /**
   * The maximum share-price movement tolerated between calldata construction and onchain
   * execution, in basis points. Defaults to 100 bps (1%) when omitted.
   */
  maxSlippageBps?: number;
  /** The idempotency key. */
  idempotencyKey?: string;
}

/**
 * Options for redeeming the vault fee shares held by a vault's fee recipient EVM account.
 */
export interface AccountRedeemVaultFeesOptions extends RedeemVaultFeesOptions {
  /** The address of the EVM account that is the vault's fee recipient. */
  address: Address;
}

/**
 * Options for redeeming the vault fee shares held by a vault's fee recipient EVM Smart Account.
 */
export interface SmartAccountRedeemVaultFeesOptions extends RedeemVaultFeesOptions {
  /** The address of the EVM Smart Account that is the vault's fee recipient. */
  address: Address;
  /**
   * Whether to use the CDP Paymaster to sponsor gas fees. Only supported on Base and Base Sepolia.
   * Cannot be used together with `paymasterUrl`.
   */
  useCdpPaymaster?: boolean;
  /** A custom Paymaster URL to sponsor gas fees. Cannot be used together with `useCdpPaymaster`. */
  paymasterUrl?: string;
  /** The ERC-7677 paymaster context forwarded to the paymaster service. Requires a paymaster. */
  paymasterContext?: PaymasterContext;
}

/**
 * Redeems every vault share held by a vault's fee recipient EVM account for the vault's
 * underlying asset (e.g. USDC). The account must be the vault's fee recipient.
 *
 * This redeems the account's full share balance, including any shares from the account's own
 * deposits into the vault, so use a dedicated fee recipient account.
 *
 * @param apiClient - The API client.
 * @param options - The options for redeeming the vault fees.
 *
 * @returns An object containing the broadcast redemption transaction hash.
 */
export async function redeemVaultFees(
  apiClient: CdpOpenApiClientType,
  options: AccountRedeemVaultFeesOptions,
): Promise<TransactionResult> {
  const { address, vaultId, maxSlippageBps, idempotencyKey } = options;

  const result = await apiClient.redeemVaultFeesWithEvmAccount(
    address,
    { vaultId, maxSlippageBps },
    idempotencyKey,
  );

  return {
    transactionHash: result.transactionHash as Hex,
  };
}

/**
 * Redeems every vault share held by a vault's fee recipient EVM Smart Account for the vault's
 * underlying asset (e.g. USDC). The Smart Account must be the vault's fee recipient, and its
 * owner must be a CDP EVM account.
 *
 * The share approval and redemption are batched into a single user operation. This redeems the
 * Smart Account's full share balance, including any shares from its own deposits into the vault,
 * so use a dedicated fee recipient Smart Account.
 *
 * @param apiClient - The API client.
 * @param options - The options for redeeming the vault fees.
 *
 * @returns The broadcast user operation. Use `waitForUserOperation` with the returned
 * `userOpHash` to wait for it to complete.
 */
export async function redeemVaultFeesWithSmartAccount(
  apiClient: CdpOpenApiClientType,
  options: SmartAccountRedeemVaultFeesOptions,
): Promise<SendUserOperationReturnType> {
  const {
    address,
    vaultId,
    maxSlippageBps,
    useCdpPaymaster,
    paymasterUrl,
    paymasterContext,
    idempotencyKey,
  } = options;

  const result = await apiClient.redeemVaultFeesWithEvmSmartAccount(
    address,
    {
      vaultId,
      maxSlippageBps,
      useCdpPaymaster,
      paymasterUrl,
      paymasterContext,
    },
    idempotencyKey,
  );

  return {
    smartAccountAddress: address,
    status: EvmUserOperationStatus.broadcast,
    userOpHash: result.userOpHash as Hex,
  };
}
