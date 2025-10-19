import { Network } from "./types.js";

import type { Address } from "viem";

/**
 * Type guard to check if a string is a valid hex address
 *
 * @param address - The address string to validate
 * @returns True if the address starts with 0x
 */
function isValidAddress(address: string): address is Address {
  return address.startsWith("0x");
}

/**
 * The address of an ERC20 token for a given network.
 */
const addressMap: Record<string, Record<string, string | undefined> | undefined> = {
  base: {
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  },
  "base-sepolia": {
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  },
};

/**
 * Get the address of an ERC20 token for a given network.
 * If a contract address is provided, it will not be found in the map and will be returned as is.
 *
 * @param token - The token symbol or contract address.
 * @param network - The network to get the address for.
 *
 * @returns The address of the ERC20 token.
 */
export function getErc20Address(token: string, network: Network): Address {
  const address = addressMap[network]?.[token] ?? token;

  if (!isValidAddress(address)) {
    throw new Error(`Invalid address format: ${address}. Address must start with 0x`);
  }

  return address;
}
