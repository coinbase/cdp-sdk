import { encodeFunctionData, erc20Abi } from "viem";

import { getErc20Address } from "./utils.js";
import { mapChainToNetwork } from "../../../accounts/evm/chainToNetworkMapper.js";

import type { Network, TransferOptions } from "./types.js";
import type { EvmAccount } from "../../../accounts/evm/types.js";
import type { Hex } from "../../../types/misc.js";
import type { TransactionResult } from "../sendTransaction.js";
import type { Account, Chain, Transport, WalletClient } from "viem";

/**
 * Transfer an amount of a token from a network-scoped account to another account.
 * This function is used for accounts that are scoped to a specific network and use
 * a wallet client for transaction execution instead of the API client.
 *
 * @param walletClient - The wallet client to use for transaction execution.
 * @param from - The account to send the transaction from.
 * @param transferArgs - The transfer options.
 * @returns The result of the transfer.
 */
export async function transferWithViem<T extends EvmAccount>(
  walletClient: WalletClient<Transport, Chain, Account>,
  from: T,
  transferArgs: Omit<TransferOptions, "address" | "network">,
): Promise<TransactionResult> {
  const token = transferArgs.token;
  const to = typeof transferArgs.to === "string" ? transferArgs.to : transferArgs.to.address;
  const value = transferArgs.amount;

  if (token === "eth") {
    const hash = await walletClient.sendTransaction({
      account: from.address,
      to,
      value,
    });
    return { transactionHash: hash as Hex };
  }

  const network = mapChainToNetwork(walletClient.chain) as Network;
  const erc20Address = getErc20Address(token, network);

  // First approve the transfer
  await walletClient.sendTransaction({
    account: from.address,
    to: erc20Address,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [to, value],
    }),
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
  });

  return { transactionHash: hash as Hex };
}
