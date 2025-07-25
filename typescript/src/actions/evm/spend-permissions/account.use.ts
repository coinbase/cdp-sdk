import { encodeFunctionData } from "viem";

import {
  SPEND_PERMISSION_MANAGER_ABI,
  SPEND_PERMISSION_MANAGER_ADDRESS,
} from "../../../spend-permissions/constants.js";
import { serializeEIP1559Transaction } from "../../../utils/serializeTransaction.js";

import type { UseSpendPermissionOptions } from "./types.js";
import type {
  CdpOpenApiClientType,
  SendEvmTransactionBodyNetwork,
} from "../../../openapi-client/index.js";
import type { Address, Hex } from "../../../types/misc.js";
import type { TransactionResult } from "../sendTransaction.js";

/**
 * Use a spend permission to spend tokens.
 *
 * @param apiClient - The API client to use.
 * @param address - The address of the account to use the spend permission on.
 * @param options - The options for the spend permission.
 *
 * @returns The transaction hash of the spend permission.
 */
export async function useSpendPermission(
  apiClient: CdpOpenApiClientType,
  address: Address,
  options: UseSpendPermissionOptions,
): Promise<TransactionResult> {
  const { spendPermission, value, network } = options;

  const result = await apiClient.sendEvmTransaction(address, {
    transaction: serializeEIP1559Transaction({
      to: SPEND_PERMISSION_MANAGER_ADDRESS,
      data: encodeFunctionData({
        abi: SPEND_PERMISSION_MANAGER_ABI,
        functionName: "spend",
        args: [spendPermission, value],
      }),
    }),
    network: network as SendEvmTransactionBodyNetwork,
  });

  return {
    transactionHash: result.transactionHash as Hex,
  };
}
