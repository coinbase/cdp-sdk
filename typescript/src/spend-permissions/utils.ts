import { getErc20Address } from "../actions/evm/transfer/utils.js";
import { UserInputValidationError } from "../errors.js";

import type { Network } from "../actions/evm/transfer/types.js";
import type { SpendPermissionNetwork } from "../openapi-client/index.js";
import type { Address } from "../types/misc.js";

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
