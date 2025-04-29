import { encodeFunctionData, erc20Abi } from "viem";

import { TransferExecutionStrategy } from "./types.js";
import { getErc20Address } from "./utils.js";
import { EvmSmartAccount } from "../../../accounts/types.js";
import { sendUserOperation } from "../sendUserOperation.js";
import { waitForUserOperation } from "../waitForUserOperation.js";

export const smartAccountTransferStrategy: TransferExecutionStrategy<EvmSmartAccount> = {
  executeTransfer: async ({ apiClient, from, transferArgs, to, value }) => {
    const userOpHash = await (async () => {
      if (transferArgs.token === "eth") {
        const result = await sendUserOperation(apiClient, from, {
          network: transferArgs.network,
          calls: [
            {
              to,
              value,
              data: "0x",
            },
          ],
        });
        return result.userOpHash;
      } else {
        const erc20Address = getErc20Address(transferArgs.token, transferArgs.network);

        const result = await sendUserOperation(apiClient, from, {
          network: transferArgs.network,
          calls: [
            {
              to: erc20Address,
              data: encodeFunctionData({
                abi: erc20Abi,
                functionName: "approve",
                args: [to, value],
              }),
            },
            {
              to: erc20Address,
              data: encodeFunctionData({
                abi: erc20Abi,
                functionName: "transfer",
                args: [to, value],
              }),
            },
          ],
        });

        return result.userOpHash;
      }
    })();

    return userOpHash;
  },

  waitForResult: async ({ apiClient, publicClient, from, hash }) => {
    const result = await waitForUserOperation(apiClient, {
      smartAccountAddress: from.address,
      userOpHash: hash,
    });

    if (result.status === "complete") {
      return { status: "success", transactionHash: hash };
    } else {
      throw new Error(
        `Transaction failed. Check the transaction on the explorer: ${publicClient.chain.blockExplorers?.default.url}/tx/${hash}`,
      );
    }
  },
};
