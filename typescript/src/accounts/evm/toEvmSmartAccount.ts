import { resolveNetworkToChain } from "./networkToChainResolver.js";
import { toNetworkScopedEvmSmartAccount } from "./toNetworkScopedEvmSmartAccount.js";
import { getUserOperation } from "../../actions/evm/getUserOperation.js";
import {
  listTokenBalances,
  type ListTokenBalancesOptions,
  type ListTokenBalancesResult,
} from "../../actions/evm/listTokenBalances.js";
import {
  RequestFaucetResult,
  RequestFaucetOptions,
  requestFaucet,
} from "../../actions/evm/requestFaucet.js";
import {
  type SendUserOperationOptions,
  type SendUserOperationReturnType,
  sendUserOperation,
} from "../../actions/evm/sendUserOperation.js";
import { signAndWrapTypedDataForSmartAccount } from "../../actions/evm/signAndWrapTypedDataForSmartAccount.js";
import { useSpendPermission } from "../../actions/evm/spend-permissions/smartAccount.use.js";
import { UseSpendPermissionOptions } from "../../actions/evm/spend-permissions/types.js";
import { createSwapQuote } from "../../actions/evm/swap/createSwapQuote.js";
import { sendSwapOperation } from "../../actions/evm/swap/sendSwapOperation.js";
import { smartAccountTransferStrategy } from "../../actions/evm/transfer/smartAccountTransferStrategy.js";
import { transfer } from "../../actions/evm/transfer/transfer.js";
import {
  waitForUserOperation,
  WaitForUserOperationOptions,
  WaitForUserOperationReturnType,
} from "../../actions/evm/waitForUserOperation.js";
import { Analytics } from "../../analytics.js";
import {
  GetUserOperationOptions,
  SignTypedDataOptions,
  UserOperation,
} from "../../client/evm/evm.types.js";
import {
  type CdpOpenApiClientType,
  type EvmSmartAccount as EvmSmartAccountModel,
} from "../../openapi-client/index.js";

import type { EvmAccount, EvmSmartAccount, KnownEvmNetworks } from "./types.js";
import type {
  SmartAccountQuoteSwapOptions,
  SmartAccountQuoteSwapResult,
  SmartAccountSwapOptions,
  SmartAccountSwapResult,
} from "../../actions/evm/swap/types.js";
import type { Address, Hex } from "../../types/misc.js";

/**
 * Options for converting a pre-existing EvmSmartAccount and owner to a EvmSmartAccount
 */
export type ToEvmSmartAccountOptions = {
  /** The pre-existing EvmSmartAccount. */
  smartAccount: EvmSmartAccountModel;
  /** The owner of the smart account. */
  owner: EvmAccount;
};

/**
 * Creates a EvmSmartAccount instance from an existing EvmSmartAccount and owner.
 * Use this to interact with previously deployed EvmSmartAccounts, rather than creating new ones.
 *
 * The owner must be the original owner of the evm smart account.
 *
 * @param {CdpOpenApiClientType} apiClient - The API client.
 * @param {ToEvmSmartAccountOptions} options - Configuration options.
 * @param {EvmSmartAccount} options.smartAccount - The deployed evm smart account.
 * @param {EvmAccount} options.owner - The owner which signs for the smart account.
 * @returns {EvmSmartAccount} A configured EvmSmartAccount instance ready for user operation submission.
 */
export function toEvmSmartAccount(
  apiClient: CdpOpenApiClientType,
  options: ToEvmSmartAccountOptions,
): EvmSmartAccount {
  const account: EvmSmartAccount = {
    address: options.smartAccount.address as Address,
    owners: [options.owner],
    policies: options.smartAccount.policies,
    async transfer(transferArgs): Promise<SendUserOperationReturnType> {
      Analytics.trackAction({
        action: "transfer",
        accountType: "evm_smart",
        properties: {
          network: transferArgs.network,
        },
      });

      return transfer(apiClient, account, transferArgs, smartAccountTransferStrategy);
    },
    async listTokenBalances(
      options: Omit<ListTokenBalancesOptions, "address">,
    ): Promise<ListTokenBalancesResult> {
      Analytics.trackAction({
        action: "list_token_balances",
        accountType: "evm_smart",
        properties: {
          network: options.network,
        },
      });

      return listTokenBalances(apiClient, {
        ...options,
        address: this.address,
      });
    },
    async sendUserOperation(
      options: Omit<SendUserOperationOptions<unknown[]>, "smartAccount">,
    ): Promise<SendUserOperationReturnType> {
      Analytics.trackAction({
        action: "send_user_operation",
        accountType: "evm_smart",
        properties: {
          network: options.network,
        },
      });

      return sendUserOperation(apiClient, {
        ...options,
        smartAccount: account,
      });
    },
    async waitForUserOperation(
      options: Omit<WaitForUserOperationOptions, "smartAccountAddress">,
    ): Promise<WaitForUserOperationReturnType> {
      Analytics.trackAction({
        action: "wait_for_user_operation",
        accountType: "evm_smart",
      });

      return waitForUserOperation(apiClient, {
        ...options,
        smartAccountAddress: account.address,
      });
    },
    async getUserOperation(
      options: Omit<GetUserOperationOptions, "smartAccount">,
    ): Promise<UserOperation> {
      Analytics.trackAction({
        action: "get_user_operation",
        accountType: "evm_smart",
      });

      return getUserOperation(apiClient, {
        ...options,
        smartAccount: account,
      });
    },
    async requestFaucet(
      options: Omit<RequestFaucetOptions, "address">,
    ): Promise<RequestFaucetResult> {
      Analytics.trackAction({
        action: "request_faucet",
        accountType: "evm_smart",
        properties: {
          network: options.network,
        },
      });

      return requestFaucet(apiClient, {
        ...options,
        address: account.address,
      });
    },
    async quoteSwap(options: SmartAccountQuoteSwapOptions): Promise<SmartAccountQuoteSwapResult> {
      Analytics.trackAction({
        action: "quote_swap",
        accountType: "evm_smart",
        properties: {
          network: options.network,
        },
      });

      return createSwapQuote(apiClient, {
        ...options,
        taker: this.address, // Always use smart account's address as taker
        signerAddress: this.owners[0].address, // Always use owner's address as signer
        smartAccount: account, // Pass smart account for execute method support
      });
    },
    async swap(options: SmartAccountSwapOptions): Promise<SmartAccountSwapResult> {
      Analytics.trackAction({
        action: "swap",
        accountType: "evm_smart",
        properties: {
          network: "network" in options ? options.network : undefined,
        },
      });

      return sendSwapOperation(apiClient, {
        ...options,
        smartAccount: account,
        taker: this.address, // Always use smart account's address as taker
        signerAddress: this.owners[0].address, // Always use owner's address as signer
      });
    },
    async signTypedData(
      options: Omit<SignTypedDataOptions, "address"> & { network: KnownEvmNetworks },
    ): Promise<Hex> {
      Analytics.trackAction({
        action: "sign_typed_data",
        accountType: "evm_smart",
        properties: {
          network: options.network,
        },
      });

      const result = await signAndWrapTypedDataForSmartAccount(apiClient, {
        chainId: BigInt(resolveNetworkToChain(options.network).id),
        smartAccount: account,
        typedData: options,
      });
      return result.signature;
    },
    async useSpendPermission(
      options: UseSpendPermissionOptions,
    ): Promise<SendUserOperationReturnType> {
      Analytics.trackAction({
        action: "use_spend_permission",
        accountType: "evm_smart",
        properties: {
          network: options.network,
        },
      });

      return useSpendPermission(apiClient, account, options);
    },

    name: options.smartAccount.name,
    type: "evm-smart",
    useNetwork: async <Network extends KnownEvmNetworks>(network: Network) => {
      Analytics.trackAction({
        action: "use_network",
        accountType: "evm_smart",
        properties: {
          network,
        },
      });

      return toNetworkScopedEvmSmartAccount(apiClient, {
        smartAccount: account,
        owner: options.owner,
        network,
      });
    },
  };

  return account;
}
