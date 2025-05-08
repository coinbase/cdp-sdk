import { createPublicClient, http, Chain, Transport, Hex } from "viem";

import { mapNetworkToChain } from "./utils.js";
import { EvmAccount, EvmSmartAccount } from "../../../accounts/evm/types.js";
import { CdpOpenApiClientType } from "../../../openapi-client/index.js";
import { WaitOptions } from "../../../utils/wait.js";

import type { Transfer, TransferExecutionStrategy, Network } from "./types.js";

export type WaitForTransferReceiptOptions = WaitOptions & { network: Network; hash: Hex };

/**
 * Transfer an amount of a token from an account to another account.
 *
 * @param apiClient - The client to use to send the transaction.
 * @param from - The account to send the transaction from.
 * @param waitArgs - The options for the wait.
 * @param transferStrategy - The strategy to use to execute the transfer.
 * @returns The result of the transfer.
 */
export async function waitForTransferReceipt<T extends EvmAccount | EvmSmartAccount>(
  apiClient: CdpOpenApiClientType,
  from: T,
  waitArgs: WaitForTransferReceiptOptions,
  transferStrategy: TransferExecutionStrategy<T>,
): Promise<Transfer> {
  const publicClient = createPublicClient<Transport, Chain>({
    chain: mapNetworkToChain(waitArgs.network),
    transport: http(),
  });

  const result = await transferStrategy.waitForResult({
    waitOptions: waitArgs,
    publicClient,
    apiClient,
    hash: waitArgs.hash,
    from,
  });

  return {
    transactionHash: result.transactionHash,
  };
}
