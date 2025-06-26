import { WaitForTransactionReceiptParameters } from "viem";
import { base, baseSepolia, sepolia } from "viem/chains";

import { resolveViemClients } from "./resolveViemClients.js";
import { RequestFaucetOptions } from "../../actions/evm/requestFaucet.js";
import { TransactionResult } from "../../actions/evm/sendTransaction.js";
import { transferWithViem } from "../../actions/evm/transfer/transferWithViem.js";

import type { EvmServerAccount, NetworkScopedEvmServerAccount } from "./types.js";
import type { Network } from "../../actions/evm/transfer/types.js";
import type { CdpOpenApiClientType } from "../../openapi-client/index.js";
import type { Address, TransactionRequestEIP1559 } from "../../types/misc.js";

/**
 * Options for converting a pre-existing EvmAccount to a NetworkScopedEvmServerAccount.
 */
export type ToNetworkScopedEvmServerAccountOptions = {
  /** The EvmAccount that was previously created. */
  account: EvmServerAccount;
  /** The network to scope the account to. */
  network: string;
};

/**
 * Creates a Network-scoped Server-managed EvmAccount instance from an existing EvmAccount.
 * Use this to interact with previously deployed EvmAccounts on a specific network.
 *
 * @param {CdpOpenApiClientType} apiClient - The API client.
 * @param {ToNetworkScopedEvmServerAccountOptions} options - Configuration options.
 * @param {EvmServerAccount} options.account - The EvmServerAccount that was previously created.
 * @param {string} options.network - The network to scope the account to.
 * @returns {NetworkScopedEvmServerAccount} A configured NetworkScopedEvmServerAccount instance ready for signing.
 */
export async function toNetworkScopedEvmServerAccount(
  apiClient: CdpOpenApiClientType,
  options: ToNetworkScopedEvmServerAccountOptions,
): Promise<NetworkScopedEvmServerAccount> {
  const { publicClient, walletClient, chain } = await resolveViemClients({
    networkOrNodeUrl: options.network,
    account: options.account,
  });

  const shouldUseApi = chain.id === base.id || chain.id === baseSepolia.id;

  const account: NetworkScopedEvmServerAccount = {
    address: options.account.address as Address,
    network: options.network,
    signMessage: options.account.signMessage,
    sign: options.account.sign,
    signTransaction: options.account.signTransaction,
    signTypedData: options.account.signTypedData,
    name: options.account.name,
    type: "evm-server",
    policies: options.account.policies,
    requestFaucet: async (faucetOptions: Omit<RequestFaucetOptions, "address" | "network">) => {
      if (chain.id !== baseSepolia.id && chain.id !== sepolia.id) {
        throw new Error(
          "Requesting a faucet is supported only on base-sepolia or ethereum-sepolia",
        );
      }
      return options.account.requestFaucet({
        ...faucetOptions,
        network: chain.id === baseSepolia.id ? "base-sepolia" : "ethereum-sepolia",
      });
    },
    transfer: async transferArgs => {
      if (shouldUseApi) {
        return options.account.transfer({
          ...transferArgs,
          network: (chain.id === base.id ? "base" : "base-sepolia") as Network,
        });
      } else {
        return transferWithViem(walletClient, account, {
          ...transferArgs,
          network: options.network as Network,
        });
      }
    },
    sendTransaction: async txOpts => {
      if (shouldUseApi) {
        return options.account.sendTransaction({
          ...txOpts,
          network: chain.id === base.id ? "base" : "base-sepolia",
        });
      } else {
        const hash = await walletClient.sendTransaction(
          txOpts.transaction as TransactionRequestEIP1559,
        );
        return { transactionHash: hash };
      }
    },
    waitForTransactionReceipt: async (
      options: WaitForTransactionReceiptParameters | TransactionResult,
    ) => {
      if ("transactionHash" in options) {
        return publicClient.waitForTransactionReceipt({
          hash: options.transactionHash,
        });
      }
      return publicClient.waitForTransactionReceipt(options);
    },
  };

  return account;
}
