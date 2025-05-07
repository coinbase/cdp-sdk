import { encodeFunctionData, erc20Abi } from "viem";

import { TransferExecutionStrategy } from "./types.js";
import { getErc20Address } from "./utils.js";
import { EvmSmartAccount } from "../../../accounts/evm/types.js";
import { sendUserOperation } from "../sendUserOperation.js";
import { waitForUserOperation } from "../waitForUserOperation.js";

export const smartAccountTransferStrategy: TransferExecutionStrategy<EvmSmartAccount> = {
  executeTransfer: async ({ apiClient, from, to, value, token, network, paymasterUrl }) => {
    const userOpHash = await (async () => {
      if (token === "eth") {
        const result = await sendUserOperation(apiClient, {
          smartAccount: from,
          paymasterUrl,
          network,
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
        const erc20Address = getErc20Address(token, network);

        const result = await sendUserOperation(apiClient, {
          smartAccount: from,
          paymasterUrl,
          network,
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

  waitForResult: async ({ apiClient, publicClient, from, hash, waitOptions }) => {
    const result = await waitForUserOperation(apiClient, {
      smartAccountAddress: from.address,
      userOpHash: hash,
      waitOptions,
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
