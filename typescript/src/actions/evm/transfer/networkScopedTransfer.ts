import type { WalletClient } from "viem";
import type { Network, TransferExecutionStrategy, TransferOptions } from "./types.js";
import type { EvmAccount } from "../../../accounts/evm/types.js";
import { getErc20Address } from "./utils.js";
import type { TransactionResult } from "../sendTransaction.js";
import type { Hex } from "../../../types/misc.js";
import { encodeFunctionData, erc20Abi } from "viem";

/**
 * Transfer an amount of a token from a network-scoped account to another account.
 * This function is used for accounts that are scoped to a specific network and use
 * a wallet client for transaction execution instead of the API client.
 *
 * @param walletClient - The wallet client to use for transaction execution.
 * @param network - The network to transfer the token on.
 * @param from - The account to send the transaction from.
 * @param transferArgs - The transfer options.
 * @returns The result of the transfer.
 */
export async function networkScopedTransfer<T extends EvmAccount>(
  walletClient: WalletClient,
  network: string,
  from: T,
  transferArgs: TransferOptions,
): Promise<TransactionResult> {

    const { token, to, value } = {token: transferArgs.token, to: typeof transferArgs.to === "string" ? transferArgs.to : transferArgs.to.address, value: transferArgs.amount};
    
    if (token === "eth") {
      const hash = await walletClient.sendTransaction({
        account: from.address,
        to,
        value,
        chain: null,
      });
      return { transactionHash: hash as Hex };
    }

    const erc20Address = getErc20Address(token, network as Network);

    // First approve the transfer
    await walletClient.sendTransaction({
      account: from.address,
      to: erc20Address,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [to, value],
      }),
      chain: null,
    });

    // Then execute the transfer
    const hash = await walletClient.sendTransaction({
      account: from.address,
      to: erc20Address,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [to, value],
      }),
      chain: null,
    });

    return { transactionHash: hash as Hex };
}
