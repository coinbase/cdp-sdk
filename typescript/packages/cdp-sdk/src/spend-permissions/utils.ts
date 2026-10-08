import { encodeFunctionData } from "viem";

import { getErc20Address } from "../actions/evm/transfer/utils.js";
import { UserInputValidationError } from "../errors.js";
import {
  SPEND_PERMISSION_MANAGER_ABI,
  SPEND_PERMISSION_MANAGER_ADDRESS,
  SPEND_ROUTER_ABI,
  SPEND_ROUTER_ADDRESS,
} from "./constants.js";

import type { SpendPermission } from "./types.js";
import type { Network } from "../actions/evm/transfer/types.js";
import type { SpendPermissionNetwork } from "../openapi-client/index.js";
import type { Address, Hex } from "../types/misc.js";

/**
 * Resolve the address of a token for a given network.
 *
 * @param token - The token symbol or contract address.
 * @param network - The network to get the address for.
 *
 * @returns The address of the token.
 */
export function resolveTokenAddress(
  token: "eth" | "usdc" | Address,
  network: SpendPermissionNetwork,
): Address {
  if (token === "eth") {
    return "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
  }

  if (token === "usdc" && (network === "base" || network === "base-sepolia")) {
    return getErc20Address(token, network as Network);
  }

  if (token === "usdc") {
    throw new UserInputValidationError(
      `Automatic token address lookup for ${token} is not supported on ${network}. Please provide the token address manually.`,
    );
  }

  return token;
}

/**
 * Reports whether a permission's onchain spender is the SpendRouter contract. Permissions
 * created via the CDP API after SpendRouter integration set spender to this address; pre-router
 * permissions set it to the developer-provided address directly. Comparison is case-insensitive
 * because mixed-case addresses (EIP-55 checksums) and all-lowercase addresses both occur in the
 * wild on API responses.
 *
 * @param spender - The permission's onchain spender address.
 * @returns True if the spender is the SpendRouter contract.
 */
export function isSpendRouterPermission(spender: Address): boolean {
  return spender.toLowerCase() === SPEND_ROUTER_ADDRESS.toLowerCase();
}

/**
 * Builds the (target contract address, encoded calldata) pair to invoke a spend permission,
 * dispatching based on the permission's onchain spender. SpendRouter permissions are routed
 * to `SpendRouter.spendAndRoute`; legacy permissions to `SpendPermissionManager.spend`.
 *
 * Centralized so account.use and smartAccount.use share a single dispatch decision and stay
 * forward-compatible with any future router functions (e.g. spendAndRouteWithWithdraw) that
 * we add to the SpendRouter ABI.
 *
 * @param spendPermission - The permission to spend against.
 * @param value - The amount to spend (must be <= remaining allowance for the current period).
 * @returns The contract address and encoded calldata to send.
 */
export function buildSpendCalldata(
  spendPermission: SpendPermission,
  value: bigint,
): { to: Address; data: Hex } {
  if (isSpendRouterPermission(spendPermission.spender)) {
    return {
      to: SPEND_ROUTER_ADDRESS,
      data: encodeFunctionData({
        abi: SPEND_ROUTER_ABI,
        functionName: "spendAndRoute",
        args: [spendPermission, value],
      }),
    };
  }
  return {
    to: SPEND_PERMISSION_MANAGER_ADDRESS,
    data: encodeFunctionData({
      abi: SPEND_PERMISSION_MANAGER_ABI,
      functionName: "spend",
      args: [spendPermission, value],
    }),
  };
}
