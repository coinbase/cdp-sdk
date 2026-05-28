import { Network } from "./types.js";

import type { Address } from "viem";

/**
 * The address of an ERC20 token for a given network.
 */
const addressMap: Record<string, Record<string, Address>> = {
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
  return addressMap[network]?.[token] ?? token;
}
