import { encodeFunctionData, erc20Abi } from "viem";

import { getErc20Address } from "./utils.js";
import { SendEvmTransactionBodyNetwork } from "../../../openapi-client/index.js";
import { serializeEIP1559Transaction } from "../../../utils/serializeTransaction.js";

import type { TransferExecutionStrategy } from "./types.js";
import type { EvmAccount } from "../../../accounts/evm/types.js";
import type { TransactionResult } from "../sendTransaction.js";

export const accountTransferStrategy: TransferExecutionStrategy<EvmAccount> = {
  executeTransfer: async ({ apiClient, from, to, value, token, network }) => {
    network = network as SendEvmTransactionBodyNetwork;
    if (token === "eth") {
      return apiClient.sendEvmTransaction(from.address, {
        transaction: serializeEIP1559Transaction({
          value,
          to,
        }),
        network,
      }) as Promise<TransactionResult>;
    }

    const erc20Address = getErc20Address(token, network);

    return apiClient.sendEvmTransaction(from.address, {
      transaction: serializeEIP1559Transaction({
        to: erc20Address,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: "transfer",
          args: [to, value],
        }),
      }),
      network,
    }) as Promise<TransactionResult>;
  },
};
