import { WaitForTransactionReceiptParameters } from "viem";
import { base, baseSepolia, mainnet, sepolia } from "viem/chains";

import { mapChainToNetwork } from "./chainToNetworkMapper.js";
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
  ListEvmTokenBalancesNetwork,
  SendEvmTransactionBodyNetwork,
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
        return transferWithViem(walletClient, account, transferArgs);
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

  if (isMethodSupportedOnNetwork("quoteFund", options.network)) {
    Object.assign(account, {
      quoteFund: async (quoteFundOptions: Omit<QuoteFundOptions, "address">) => {
        return options.account.quoteFund({
          ...quoteFundOptions,
        });
      },
    });
  }

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

  if (isMethodSupportedOnNetwork("transfer", options.network)) {
    Object.assign(account, {
      transfer: async (transferOptions: TransferOptions) => {
        return options.account.transfer(transferOptions);
      },
    });
  }

  if (isMethodSupportedOnNetwork("quoteSwap", options.network)) {
    Object.assign(account, {
      quoteSwap: async (quoteSwapOptions: AccountQuoteSwapOptions) => {
        return options.account.quoteSwap(quoteSwapOptions);
      },
    });
  }

  if (isMethodSupportedOnNetwork("swap", options.network)) {
    Object.assign(account, {
      swap: async (swapOptions: AccountSwapOptions) => {
        return options.account.swap(swapOptions);
      },
    });
  }

  return account;
}
