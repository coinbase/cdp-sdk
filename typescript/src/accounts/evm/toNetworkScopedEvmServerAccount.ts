import { Chain, WaitForTransactionReceiptParameters } from "viem";
import { base, baseSepolia, mainnet, sepolia } from "viem/chains";

import { resolveViemClients } from "./resolveViemClients.js";
import { transferWithViem } from "../../actions/evm/transfer/transferWithViem.js";

import type { EvmServerAccount, NetworkScopedEvmServerAccount } from "./types.js";
import type { ListTokenBalancesOptions } from "../../actions/evm/listTokenBalances.js";
import type { RequestFaucetOptions } from "../../actions/evm/requestFaucet.js";
import type {
  SendTransactionOptions,
  TransactionResult,
} from "../../actions/evm/sendTransaction.js";
import type { TransferOptions } from "../../actions/evm/transfer/types.js";
import type {
  CdpOpenApiClientType,
  ListEvmTokenBalancesNetwork,
} from "../../openapi-client/index.js";
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
 * Resolves the network identifier from a chain.
 *
 * @param chain - The chain to resolve the network from.
 * @returns The network identifier.
 */
function resolveNetworkFromChainForListTokenBalances(chain: Chain): ListEvmTokenBalancesNetwork {
  if (chain.id === base.id) {
    return "base";
  } else if (chain.id === baseSepolia.id) {
    return "base-sepolia";
  } else if (chain.id === mainnet.id) {
    return "ethereum";
  } else {
    throw new Error(`CDP API does not support chain id: ${chain.id}`);
  }
}

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
export async function toNetworkScopedEvmServerAccount<Network extends string>(
  apiClient: CdpOpenApiClientType,
  options: ToNetworkScopedEvmServerAccountOptions & { network: Network },
): Promise<NetworkScopedEvmServerAccount<Network>> {
  const { publicClient, walletClient, chain } = await resolveViemClients({
    networkOrNodeUrl: options.network,
    account: options.account,
  });

  const shouldUseApi = chain.id === base.id || chain.id === baseSepolia.id;

  // Build the account object dynamically based on network support
  const account = {
    address: options.account.address as Address,
    network: options.network as Network,
    signMessage: options.account.signMessage,
    sign: options.account.sign,
    signTransaction: options.account.signTransaction,
    signTypedData: options.account.signTypedData,
    name: options.account.name,
    type: "evm-server" as const,
    policies: options.account.policies,
    sendTransaction: async (txOpts: Omit<SendTransactionOptions, "address" | "network">) => {
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
    transfer: async (transferArgs: Omit<TransferOptions, "address" | "network">) => {
      if (shouldUseApi) {
        return options.account.transfer({
          ...transferArgs,
          network: chain.id === base.id ? "base" : "base-sepolia",
        });
      } else {
        return transferWithViem(walletClient, account, {
          ...transferArgs,
          network: chain.id === base.id ? "base" : "base-sepolia",
        });
      }
    },
    waitForTransactionReceipt: async (
      waitOptions: WaitForTransactionReceiptParameters | TransactionResult,
    ) => {
      if ("transactionHash" in waitOptions) {
        return publicClient.waitForTransactionReceipt({
          hash: waitOptions.transactionHash,
        });
      }
      return publicClient.waitForTransactionReceipt(waitOptions);
    },
  } as NetworkScopedEvmServerAccount<Network>;

  // Conditionally add listTokenBalances if the network supports it
  if (chain.id === base.id || chain.id === baseSepolia.id || chain.id === mainnet.id) {
    Object.assign(account, {
      listTokenBalances: async (
        listTokenBalancesOptions: Omit<ListTokenBalancesOptions, "address" | "network">,
      ) => {
        return options.account.listTokenBalances({
          ...listTokenBalancesOptions,
          network: resolveNetworkFromChainForListTokenBalances(chain),
        });
      },
    });
  }

  // Conditionally add requestFaucet if the network supports it
  if (chain.id === baseSepolia.id || chain.id === sepolia.id) {
    Object.assign(account, {
      requestFaucet: async (faucetOptions: Omit<RequestFaucetOptions, "address" | "network">) => {
        return options.account.requestFaucet({
          ...faucetOptions,
          network: chain.id === baseSepolia.id ? "base-sepolia" : "ethereum-sepolia",
        });
      },
    });
  }

  return account;
}
