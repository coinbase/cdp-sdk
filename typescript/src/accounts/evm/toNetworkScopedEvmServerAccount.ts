import { WaitForTransactionReceiptParameters } from "viem";
import { base, baseSepolia } from "viem/chains";

import { isMethodSupportedOnNetwork } from "./networkCapabilities.js";
import { resolveViemClients } from "./resolveViemClients.js";
import { transferWithViem } from "../../actions/evm/transfer/transferWithViem.js";

import type { EvmServerAccount, NetworkScopedEvmServerAccount } from "./types.js";
import type { FundOptions } from "../../actions/evm/fund/fund.js";
import type { QuoteFundOptions } from "../../actions/evm/fund/quoteFund.js";
import type { WaitForFundOperationOptions } from "../../actions/evm/fund/waitForFundOperationReceipt.js";
import type { ListTokenBalancesOptions } from "../../actions/evm/listTokenBalances.js";
import type { RequestFaucetOptions } from "../../actions/evm/requestFaucet.js";
import type {
  SendTransactionOptions,
  TransactionResult,
} from "../../actions/evm/sendTransaction.js";
import type { AccountQuoteSwapOptions, AccountSwapOptions } from "../../actions/evm/swap/types.js";
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
  if (isMethodSupportedOnNetwork("listTokenBalances", options.network)) {
    Object.assign(account, {
      listTokenBalances: async (
        listTokenBalancesOptions: Omit<ListTokenBalancesOptions, "address" | "network">,
      ) => {
        return options.account.listTokenBalances({
          ...listTokenBalancesOptions,
          network: options.network as ListEvmTokenBalancesNetwork,
        });
      },
    });
  }

  // Conditionally add requestFaucet if the network supports it
  if (isMethodSupportedOnNetwork("requestFaucet", options.network)) {
    Object.assign(account, {
      requestFaucet: async (faucetOptions: Omit<RequestFaucetOptions, "address" | "network">) => {
        return options.account.requestFaucet({
          ...faucetOptions,
          network: chain.id === baseSepolia.id ? "base-sepolia" : "ethereum-sepolia",
        });
      },
    });
  }

  // Conditionally add quoteFund if the network supports it
  if (isMethodSupportedOnNetwork("quoteFund", options.network)) {
    Object.assign(account, {
      quoteFund: async (quoteFundOptions: Omit<QuoteFundOptions, "address">) => {
        return options.account.quoteFund({
          ...quoteFundOptions,
        });
      },
    });
  }

  // Conditionally add fund and waitForFundOperationReceipt if the network supports it
  if (isMethodSupportedOnNetwork("fund", options.network)) {
    Object.assign(account, {
      fund: async (fundOptions: Omit<FundOptions, "address">) => {
        return options.account.fund({
          ...fundOptions,
        });
      },
      waitForFundOperationReceipt: async (waitOptions: WaitForFundOperationOptions) => {
        return options.account.waitForFundOperationReceipt(waitOptions);
      },
    });
  }

  // Conditionally add transfer if the network supports it
  if (isMethodSupportedOnNetwork("transfer", options.network)) {
    Object.assign(account, {
      transfer: async (transferOptions: TransferOptions) => {
        return options.account.transfer(transferOptions);
      },
    });
  }

  // Conditionally add quoteSwap if the network supports it
  if (isMethodSupportedOnNetwork("quoteSwap", options.network)) {
    Object.assign(account, {
      quoteSwap: async (quoteSwapOptions: AccountQuoteSwapOptions) => {
        return options.account.quoteSwap(quoteSwapOptions);
      },
    });
  }

  // Conditionally add swap if the network supports it
  if (isMethodSupportedOnNetwork("swap", options.network)) {
    Object.assign(account, {
      swap: async (swapOptions: AccountSwapOptions) => {
        return options.account.swap(swapOptions);
      },
    });
  }

  return account;
}
