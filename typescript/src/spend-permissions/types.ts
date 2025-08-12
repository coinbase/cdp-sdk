import type { SpendPermissionNetwork } from "../openapi-client/index.js";
import type { Address, Hex } from "../types/misc.js";

/**
 * A spend permission structure that defines authorization for spending tokens
 */
export type SpendPermission = {
  /** The account address that owns the tokens */
  account: Address;
  /** The address that is authorized to spend the tokens */
  spender: Address;
  /** The token contract address (use 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE for ETH) */
  token: Address;
  /** The maximum amount that can be spent (in wei for ETH, or token's smallest unit) */
  allowance: bigint;
  /** Time period in seconds for the spending allowance */
  period: number;
  /** Start timestamp for when the permission becomes valid */
  start: number;
  /** End timestamp for when the permission expires */
  end: number;
  /** Unique salt to prevent replay attacks */
  salt: bigint;
  /** Additional data for the permission */
  extraData: Hex;
};

export type SpendPermissionInput = Omit<
  SpendPermission,
  "token" | "salt" | "extraData" | "period" | "start" | "end"
> & {
  token: "eth" | "usdc" | Address;
  salt?: bigint;
  extraData?: Hex;
  period?: number;
  periodInDays?: number;
  start?: Date;
  end?: Date;
};

export interface CreateSpendPermissionOptions {
  /** The spend permission. */
  spendPermission: SpendPermissionInput;
  /** The network. */
  network: SpendPermissionNetwork;
  /** The paymaster URL. */
  paymasterUrl?: string;
  /** The idempotency key. */
  idempotencyKey?: string;
}

export interface ListSpendPermissionsOptions {
  /** The address of the smart account. */
  address: Address;
  /** The page size to paginate through the spend permissions. */
  pageSize?: number;
  /** The page token to paginate through the spend permissions. */
  pageToken?: string;
}

export interface RevokeSpendPermissionOptions {
  /** The address of the smart account. */
  address: Address;
  /** The hash of the spend permission to revoke. */
  permissionHash: Hex;
  /** The network. */
  network: SpendPermissionNetwork;
  /** The paymaster URL. */
  paymasterUrl?: string;
  /** The idempotency key. */
  idempotencyKey?: string;
}
