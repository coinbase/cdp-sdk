import {
  encodeFunctionData,
  erc20Abi,
  Hex,
  TransactionReceipt,
  WaitForTransactionReceiptTimeoutError,
} from "viem";

import { TransferExecutionStrategy } from "./types.js";
import { getErc20Address } from "./utils.js";
import { EvmAccount } from "../../../accounts/evm/types.js";
import { serializeEIP1559Transaction } from "../../../utils/serializeTransaction.js";

export const accountTransferStrategy: TransferExecutionStrategy<EvmAccount> = {
  executeTransfer: async ({ apiClient, from, to, value, token, network }) => {
    const transactionHash = await (async () => {
      if (token === "eth") {
        const result = await apiClient.sendEvmTransaction(from.address, {
          transaction: serializeEIP1559Transaction({
            value,
            to,
          }),
          network,
        });
        return result.transactionHash as Hex;
      } else {
        const erc20Address = getErc20Address(token, network);

        await apiClient.sendEvmTransaction(from.address, {
          transaction: serializeEIP1559Transaction({
            to: erc20Address,
            data: encodeFunctionData({
              abi: erc20Abi,
              functionName: "approve",
              args: [to, value],
            }),
          }),
          network,
        });

        const result = await apiClient.sendEvmTransaction(from.address, {
          transaction: serializeEIP1559Transaction({
            to: erc20Address,
            data: encodeFunctionData({
              abi: erc20Abi,
              functionName: "transfer",
              args: [to, value],
            }),
          }),
          network,
        });

        return result.transactionHash as Hex;
      }
    })();

    return transactionHash;
  },

  waitForResult: async ({ publicClient, hash, waitOptions }) => {
    let receipt: TransactionReceipt;
    try {
      receipt = await publicClient.waitForTransactionReceipt({
        hash,
        pollingInterval: waitOptions?.intervalSeconds
          ? waitOptions.intervalSeconds * 1000
          : undefined,
        timeout: waitOptions?.timeoutSeconds ? waitOptions.timeoutSeconds * 1000 : undefined,
      });
    } catch (error) {
      if (error instanceof WaitForTransactionReceiptTimeoutError) {
        throw new Error(
          `Transaction timed out. Check the transaction on the explorer: ${publicClient.chain.blockExplorers?.default.url}/tx/${hash}`,
        );
      } else {
        throw error;
      }
    }

    if (receipt.status === "success") {
      return { status: receipt.status, transactionHash: hash };
    } else {
      throw new Error(
        `Transaction failed. Check the transaction on the explorer: ${publicClient.chain.blockExplorers?.default.url}/tx/${hash}`,
      );
    }
  },
};
