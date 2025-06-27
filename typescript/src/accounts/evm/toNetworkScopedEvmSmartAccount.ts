import { getBaseNodeRpcUrl } from "./getBaseNodeRpcUrl.js";
import { isMethodSupportedOnNetwork } from "./networkCapabilities.js";
import { fund } from "../../actions/evm/fund/fund.js";
import { quoteFund } from "../../actions/evm/fund/quoteFund.js";
import { waitForFundOperationReceipt } from "../../actions/evm/fund/waitForFundOperationReceipt.js";
import { getUserOperation } from "../../actions/evm/getUserOperation.js";
import { listTokenBalances } from "../../actions/evm/listTokenBalances.js";
import { requestFaucet } from "../../actions/evm/requestFaucet.js";
import { sendUserOperation } from "../../actions/evm/sendUserOperation.js";
import { createSwapQuote } from "../../actions/evm/swap/createSwapQuote.js";
import { sendSwapOperation } from "../../actions/evm/swap/sendSwapOperation.js";
import { smartAccountTransferStrategy } from "../../actions/evm/transfer/smartAccountTransferStrategy.js";
import { transfer } from "../../actions/evm/transfer/transfer.js";
import { waitForUserOperation } from "../../actions/evm/waitForUserOperation.js";

import type {
  EvmAccount,
  EvmSmartAccount,
  KnownEvmNetworks,
  NetworkScopedEvmSmartAccount,
} from "./types.js";
import type { FundOptions } from "../../actions/evm/fund/fund.js";
import type { QuoteFundOptions } from "../../actions/evm/fund/quoteFund.js";
import type { WaitForFundOperationOptions } from "../../actions/evm/fund/waitForFundOperationReceipt.js";
import type { ListTokenBalancesOptions } from "../../actions/evm/listTokenBalances.js";
import type { RequestFaucetOptions } from "../../actions/evm/requestFaucet.js";
import type { SendUserOperationOptions } from "../../actions/evm/sendUserOperation.js";
import type {
  SmartAccountQuoteSwapOptions,
  SmartAccountSwapNetwork,
  SmartAccountSwapOptions,
} from "../../actions/evm/swap/types.js";
import type { SmartAccountTransferOptions } from "../../actions/evm/transfer/types.js";
import type { WaitForUserOperationOptions } from "../../actions/evm/waitForUserOperation.js";
import type { GetUserOperationOptions } from "../../client/evm/evm.types.js";
import type {
  CdpOpenApiClientType,
  EvmUserOperationNetwork,
  ListEvmTokenBalancesNetwork,
} from "../../openapi-client/index.js";

/**
 * Options for converting a pre-existing EvmSmartAccount and owner to a NetworkScopedEvmSmartAccount
 */
export type ToNetworkScopedEvmSmartAccountOptions = {
  /** The pre-existing EvmSmartAccount. */
  smartAccount: EvmSmartAccount;
  /** The network to scope the smart account object to. */
  network: KnownEvmNetworks;
  /** The owner of the smart account. */
  owner: EvmAccount;
};

/**
 * Creates a NetworkScopedEvmSmartAccount instance from an existing EvmSmartAccount and owner.
 * Use this to interact with previously deployed EvmSmartAccounts, rather than creating new ones.
 *
 * The owner must be the original owner of the evm smart account.
 *
 * @param {CdpOpenApiClientType} apiClient - The API client.
 * @param {ToNetworkScopedEvmSmartAccountOptions} options - Configuration options.
 * @param {EvmSmartAccount} options.smartAccount - The deployed evm smart account.
 * @param {EvmAccount} options.owner - The owner which signs for the smart account.
 * @param {KnownEvmNetworks} options.network - The network to scope the smart account to.
 * @returns {NetworkScopedEvmSmartAccount} A configured NetworkScopedEvmSmartAccount instance ready for user operation submission.
 */
export async function toNetworkScopedEvmSmartAccount<Network extends KnownEvmNetworks>(
  apiClient: CdpOpenApiClientType,
  options: ToNetworkScopedEvmSmartAccountOptions & { network: Network },
): Promise<NetworkScopedEvmSmartAccount<Network>> {
  const paymasterUrl = await (async () => {
    if (options.network === "base") {
      return getBaseNodeRpcUrl(options.network);
    }
    return undefined;
  })();

  const account = {
    address: options.smartAccount.address,
    network: options.network,
    owners: [options.owner],
    name: options.smartAccount.name,
    type: "evm-smart",
    sendUserOperation: async (
      userOpOptions: Omit<SendUserOperationOptions<unknown[]>, "smartAccount" | "network">,
    ) => {
      return sendUserOperation(apiClient, {
        ...userOpOptions,
        smartAccount: options.smartAccount,
        network: options.network as EvmUserOperationNetwork,
        paymasterUrl: userOpOptions.paymasterUrl ?? paymasterUrl,
      });
    },
    waitForUserOperation: async (
      waitOptions: Omit<WaitForUserOperationOptions, "smartAccountAddress">,
    ) => {
      return waitForUserOperation(apiClient, {
        ...waitOptions,
        smartAccountAddress: options.smartAccount.address,
      });
    },
    getUserOperation: async (getOptions: Omit<GetUserOperationOptions, "smartAccount">) => {
      return getUserOperation(apiClient, {
        ...getOptions,
        smartAccount: options.smartAccount,
      });
    },
  } as NetworkScopedEvmSmartAccount<Network>;

  if (isMethodSupportedOnNetwork("transfer", options.network)) {
    Object.assign(account, {
      transfer: async (transferOptions: Omit<SmartAccountTransferOptions, "network">) => {
        return transfer(
          apiClient,
          options.smartAccount,
          {
            ...transferOptions,
            network: options.network as EvmUserOperationNetwork,
            paymasterUrl: transferOptions.paymasterUrl ?? paymasterUrl,
          },
          smartAccountTransferStrategy,
        );
      },
    });
  }

  if (isMethodSupportedOnNetwork("listTokenBalances", options.network)) {
    Object.assign(account, {
      listTokenBalances: async (
        listOptions: Omit<ListTokenBalancesOptions, "address" | "network">,
      ) => {
        return listTokenBalances(apiClient, {
          ...listOptions,
          address: options.smartAccount.address,
          network: options.network as ListEvmTokenBalancesNetwork,
        });
      },
    });
  }

  if (isMethodSupportedOnNetwork("requestFaucet", options.network)) {
    Object.assign(account, {
      requestFaucet: async (faucetOptions: Omit<RequestFaucetOptions, "address" | "network">) => {
        return requestFaucet(apiClient, {
          ...faucetOptions,
          address: options.smartAccount.address,
          network: options.network as "base-sepolia" | "ethereum-sepolia",
        });
      },
    });
  }

  if (isMethodSupportedOnNetwork("quoteFund", options.network)) {
    Object.assign(account, {
      quoteFund: async (quoteOptions: Omit<QuoteFundOptions, "address">) => {
        return quoteFund(apiClient, {
          ...quoteOptions,
          address: options.smartAccount.address,
        });
      },
    });
  }

  if (isMethodSupportedOnNetwork("fund", options.network)) {
    Object.assign(account, {
      fund: async (fundOptions: Omit<FundOptions, "address">) => {
        return fund(apiClient, {
          ...fundOptions,
          address: options.smartAccount.address,
        });
      },
      waitForFundOperationReceipt: async (waitOptions: WaitForFundOperationOptions) => {
        return waitForFundOperationReceipt(apiClient, waitOptions);
      },
    });
  }

  if (isMethodSupportedOnNetwork("quoteSwap", options.network)) {
    Object.assign(account, {
      quoteSwap: async (quoteSwapOptions: SmartAccountQuoteSwapOptions) => {
        return createSwapQuote(apiClient, {
          ...quoteSwapOptions,
          taker: options.smartAccount.address,
          signerAddress: options.owner.address,
          smartAccount: options.smartAccount,
          network: options.network as SmartAccountSwapNetwork,
        });
      },
    });
  }

  if (isMethodSupportedOnNetwork("swap", options.network)) {
    Object.assign(account, {
      swap: async (swapOptions: SmartAccountSwapOptions) => {
        return sendSwapOperation(apiClient, {
          ...swapOptions,
          smartAccount: options.smartAccount,
          taker: options.smartAccount.address,
          signerAddress: options.owner.address,
          network: options.network as SmartAccountSwapNetwork,
          paymasterUrl: swapOptions.paymasterUrl ?? paymasterUrl,
        });
      },
    });
  }

  return account;
}
