import { createPublicClient, http, erc20Abi, parseUnits, Address, Chain, Transport } from "viem";

import { mapNetworkToChain } from "./utils.js";
import { EvmAccount, EvmSmartAccount } from "../../../accounts/evm/types.js";
import { CdpOpenApiClientType } from "../../../openapi-client/index.js";

import type {
  TransferResult,
  TransferExecutionStrategy,
  SmartAccountTransferOptions,
  AccountTransferOptions,
} from "./types.js";

/**
 * Transfer an amount of a token from an account to another account.
 *
 * @param apiClient - The client to use to send the transaction.
 * @param from - The account to send the transaction from.
 * @param transferArgs - The options for the transfer.
 * @param transferStrategy - The strategy to use to execute the transfer.
 * @returns The result of the transfer.
 */
export async function transfer<T extends EvmAccount | EvmSmartAccount>(
  apiClient: CdpOpenApiClientType,
  from: T,
  transferArgs: T extends EvmSmartAccount ? SmartAccountTransferOptions : AccountTransferOptions,
  transferStrategy: TransferExecutionStrategy<T>,
): Promise<TransferResult> {
  const publicClient = createPublicClient<Transport, Chain>({
    chain: mapNetworkToChain(transferArgs.network),
    transport: http(),
  });

  const to =
    typeof transferArgs.to === "string" ? transferArgs.to : (transferArgs.to.address as Address);

  const value = await (async () => {
    // user supplied a bigint. otherwise, we need to convert the amount to a bigint
    if (typeof transferArgs.amount !== "string") {
      return transferArgs.amount;
    }

    const decimals = await (async () => {
      if (transferArgs.token === "eth") {
        return 18;
      } else if (transferArgs.token === "usdc") {
        return 6;
      } else {
        return publicClient.readContract({
          address: transferArgs.token,
          abi: erc20Abi,
          functionName: "decimals",
          args: [],
        });
      }
    })();

    return parseUnits(transferArgs.amount, decimals);
  })();

  const transfer = {
    apiClient,
    from,
    to,
    value,
    token: transferArgs.token,
    network: transferArgs.network,
    paymasterUrl: "paymasterUrl" in transferArgs ? transferArgs.paymasterUrl : undefined,
  };

  const hash = await transferStrategy.executeTransfer(transfer);

  const result = await transferStrategy.waitForResult({
    apiClient,
    publicClient,
    from,
    hash,
    waitOptions: transferArgs.waitOptions,
  });

  return result;
}
