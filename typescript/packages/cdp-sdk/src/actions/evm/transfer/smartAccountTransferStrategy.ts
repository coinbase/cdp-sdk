import { encodeFunctionData, erc20Abi } from "viem";

import { getErc20Address } from "./utils.js";
import { sendUserOperation } from "../sendUserOperation.js";

import type { TransferExecutionStrategy } from "./types.js";
import type { EvmSmartAccount } from "../../../accounts/evm/types.js";
import type { EvmUserOperationNetwork } from "../../../openapi-client/index.js";

export const smartAccountTransferStrategy: TransferExecutionStrategy<EvmSmartAccount> = {
  executeTransfer: async ({ apiClient, from, to, value, token, network, paymasterUrl }) => {
    const smartAccountNetwork = network as EvmUserOperationNetwork;

    if (token === "eth") {
      const result = await sendUserOperation(apiClient, {
        smartAccount: from,
        paymasterUrl,
        network: smartAccountNetwork,
        calls: [
          {
            to,
            value,
            data: "0x",
          },
        ],
      });
      return result;
    } else {
      const erc20Address = getErc20Address(token, network);

      const result = await sendUserOperation(apiClient, {
        smartAccount: from,
        paymasterUrl,
        network: smartAccountNetwork,
        calls: [
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

      return result;
    }
  },
};
