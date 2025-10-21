import { WaitForTransactionReceiptParameters } from "viem";
import { base, baseSepolia, mainnet, sepolia } from "viem/chains";

import { mapChainToNetwork } from "./chainToNetworkMapper.js";
import { isMethodSupportedOnNetwork } from "./networkCapabilities.js";
import { resolveViemClients } from "./resolveViemClients.js";
import { transferWithViem } from "../../actions/evm/transfer/transferWithViem.js";
import { Analytics } from "../../analytics.js";

import type { EvmServerAccount, NetworkScopedEvmServerAccount, DistributedOmit } from "./types.js";
import type { ListTokenBalancesOptions } from "../../actions/evm/listTokenBalances.js";
import type { RequestFaucetOptions } from "../../actions/evm/requestFaucet.js";
import type {
  SendTransactionOptions,
  TransactionResult,
} from "../../actions/evm/sendTransaction.js";
import type { UseSpendPermissionOptions } from "../../actions/evm/spend-permissions/types.js";
import type { AccountQuoteSwapOptions, AccountSwapOptions } from "../../actions/evm/swap/types.js";
import type { TransferOptions } from "../../actions/evm/transfer/types.js";
import type { EvmSwapsNetwork } from "../../openapi-client/generated/coinbaseDeveloperPlatformAPIs.schemas.js";
import type {
  ListEvmTokenBalancesNetwork,
  SendEvmTransactionBodyNetwork,
  SpendPermissionNetwork,
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
 * Creates a Network-scoped Server-managed EvmAccount instance from an existing EvmAccount.
 * Use this to interact with previously deployed EvmAccounts on a specific network.
 *
 * @param {ToNetworkScopedEvmServerAccountOptions} options - Configuration options.
 * @param {EvmServerAccount} options.account - The EvmServerAccount that was previously created.
 * @param {string} options.network - The network to scope the account to.
 * @returns {NetworkScopedEvmServerAccount} A configured NetworkScopedEvmServerAccount instance ready for signing.
 */
export async function toNetworkScopedEvmServerAccount<Network extends string>(
  options: ToNetworkScopedEvmServerAccountOptions & { network: Network },
): Promise<NetworkScopedEvmServerAccount<Network>> {
  const { publicClient, walletClient, chain } = await resolveViemClients({
    networkOrNodeUrl: options.network,
    account: options.account,
  });

  /*
   * Determine the actual network name from the resolved chain
   * This handles cases where options.network is an RPC URL
   */
  const resolvedNetworkName = mapChainToNetwork(chain) ?? options.network;

  const shouldUseApiForSends =
    chain.id === base.id ||
    chain.id === baseSepolia.id ||
    chain.id === mainnet.id ||
    chain.id === sepolia.id;

  const account = {
    address: options.account.address as Address,
    network: options.network,
    signMessage: options.account.signMessage,
    sign: options.account.sign,
    signTransaction: options.account.signTransaction,
    signTypedData: options.account.signTypedData,
    name: options.account.name,
    type: "evm-server",
    policies: options.account.policies,
    sendTransaction: async (txOpts: Omit<SendTransactionOptions, "address" | "network">) => {
      if (shouldUseApiForSends) {
        return options.account.sendTransaction({
          ...txOpts,
          network: mapChainToNetwork(chain) as SendEvmTransactionBodyNetwork,
        });
      } else {
        Analytics.trackAction({
          action: "send_transaction",
          accountType: "evm_server",
          properties: {
            network: options.network,
            managed: true,
          },
        });

        const hash = await walletClient.sendTransaction(
          txOpts.transaction as TransactionRequestEIP1559,
        );
        return { transactionHash: hash };
      }
    },
    transfer: async (transferArgs: Omit<TransferOptions, "address" | "network">) => {
      if (shouldUseApiForSends) {
        return options.account.transfer({
          ...transferArgs,
          network: mapChainToNetwork(chain) as SendEvmTransactionBodyNetwork,
        });
      } else {
        Analytics.trackAction({
          action: "transfer",
          accountType: "evm_server",
          properties: {
            network: options.network,
            managed: true,
          },
        });

        return transferWithViem(walletClient, account, transferArgs);
      }
    },
    waitForTransactionReceipt: async (
      waitOptions: WaitForTransactionReceiptParameters | TransactionResult,
    ) => {
      Analytics.trackAction({
        action: "wait_for_transaction_receipt",
        accountType: "evm_server",
        properties: {
          managed: true,
        },
      });

      if ("transactionHash" in waitOptions) {
        return publicClient.waitForTransactionReceipt({
          hash: waitOptions.transactionHash,
        });
      }
      return publicClient.waitForTransactionReceipt(waitOptions);
    },
  } as NetworkScopedEvmServerAccount<Network>;

  if (isMethodSupportedOnNetwork("listTokenBalances", resolvedNetworkName)) {
    Object.assign(account, {
      listTokenBalances: async (
        listTokenBalancesOptions: Omit<ListTokenBalancesOptions, "address" | "network">,
      ) => {
        Analytics.trackAction({
          action: "list_token_balances",
          accountType: "evm_server",
          properties: {
            managed: true,
          },
        });

        return options.account.listTokenBalances({
          ...listTokenBalancesOptions,
          network: options.network as ListEvmTokenBalancesNetwork,
        });
      },
    });
  }

  if (isMethodSupportedOnNetwork("requestFaucet", resolvedNetworkName)) {
    Object.assign(account, {
      requestFaucet: async (faucetOptions: Omit<RequestFaucetOptions, "address" | "network">) => {
        Analytics.trackAction({
          action: "request_faucet",
          accountType: "evm_server",
          properties: {
            managed: true,
          },
        });

        return options.account.requestFaucet({
          ...faucetOptions,
          network: chain.id === baseSepolia.id ? "base-sepolia" : "ethereum-sepolia",
        });
      },
    });
  }

  if (isMethodSupportedOnNetwork("quoteSwap", resolvedNetworkName)) {
    Object.assign(account, {
      quoteSwap: async (quoteSwapOptions: DistributedOmit<AccountQuoteSwapOptions, "network">) => {
        Analytics.trackAction({
          action: "quote_swap",
          accountType: "evm_server",
          properties: {
            managed: true,
          },
        });

        return options.account.quoteSwap({
          ...quoteSwapOptions,
          network: options.network as EvmSwapsNetwork,
        });
      },
    });
  }

  if (isMethodSupportedOnNetwork("swap", resolvedNetworkName)) {
    Object.assign(account, {
      swap: async (swapOptions: DistributedOmit<AccountSwapOptions, "network">) => {
        Analytics.trackAction({
          action: "swap",
          accountType: "evm_server",
          properties: {
            managed: true,
          },
        });

        /*
         * For network-scoped accounts, we need to add the network parameter
         * for inline swaps while preserving quote-based swaps as-is
         */
        const swapOptionsWithNetwork =
          "swapQuote" in swapOptions
            ? swapOptions // Quote-based swap, pass through
            : { ...swapOptions, network: options.network as EvmSwapsNetwork }; // Inline swap, add network

        return options.account.swap(swapOptionsWithNetwork as AccountSwapOptions);
      },
    });
  }

  if (isMethodSupportedOnNetwork("useSpendPermission", resolvedNetworkName)) {
    Object.assign(account, {
      useSpendPermission: async (
        spendPermissionOptions: Omit<UseSpendPermissionOptions, "network">,
      ) => {
        Analytics.trackAction({
          action: "use_spend_permission",
          accountType: "evm_server",
          properties: {
            managed: true,
          },
        });

        return options.account.useSpendPermission({
          ...spendPermissionOptions,
          network: options.network as SpendPermissionNetwork,
        });
      },
    });
  }

  return account;
}
