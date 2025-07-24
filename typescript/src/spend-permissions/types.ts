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

/**
 * Networks that the SpendPermissionManager contract supports.
 * From https://github.com/coinbase/spend-permissions/blob/main/README.md#deployments
 */
export type SpendPermissionNetworks =
  | "base"
  | "base-sepolia"
  | "ethereum"
  | "ethereum-sepolia"
  | "optimism"
  | "optimism-sepolia"
  | "arbitrum"
  | "avalanche"
  | "binance"
  | "polygon"
  | "zora";
