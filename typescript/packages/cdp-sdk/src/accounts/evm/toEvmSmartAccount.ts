import { createPublicClient, http } from "viem";

import { wrapSignatureWithEip6492IfUndeployed } from "./eip6492.js";
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

import type { EvmAccount, EvmSmartAccount, KnownEvmNetworks, NetworkOrRpcUrl } from "./types.js";
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
      try {
        return transfer(apiClient, account, transferArgs, smartAccountTransferStrategy);
      } catch (error) {
        Analytics.trackError(error, "transfer");
        throw error;
      }
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
      try {
        return listTokenBalances(apiClient, {
          ...options,
          address: this.address,
        });
      } catch (error) {
        Analytics.trackError(error, "listTokenBalances");
        throw error;
      }
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
      try {
        return sendUserOperation(apiClient, {
          ...options,
          smartAccount: account,
        });
      } catch (error) {
        Analytics.trackError(error, "sendUserOperation");
        throw error;
      }
    },
    async waitForUserOperation(
      options: Omit<WaitForUserOperationOptions, "smartAccountAddress">,
    ): Promise<WaitForUserOperationReturnType> {
      Analytics.trackAction({
        action: "wait_for_user_operation",
        accountType: "evm_smart",
      });
      try {
        return waitForUserOperation(apiClient, {
          ...options,
          smartAccountAddress: account.address,
        });
      } catch (error) {
        Analytics.trackError(error, "waitForUserOperation");
        throw error;
      }
    },
    async getUserOperation(
      options: Omit<GetUserOperationOptions, "smartAccount">,
    ): Promise<UserOperation> {
      Analytics.trackAction({
        action: "get_user_operation",
        accountType: "evm_smart",
      });
      try {
        return getUserOperation(apiClient, {
          ...options,
          smartAccount: account,
        });
      } catch (error) {
        Analytics.trackError(error, "getUserOperation");
        throw error;
      }
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
      try {
        return requestFaucet(apiClient, {
          ...options,
          address: account.address,
        });
      } catch (error) {
        Analytics.trackError(error, "requestFaucet");
        throw error;
      }
    },
    async quoteSwap(options: SmartAccountQuoteSwapOptions): Promise<SmartAccountQuoteSwapResult> {
      Analytics.trackAction({
        action: "quote_swap",
        accountType: "evm_smart",
        properties: {
          network: options.network,
        },
      });
      try {
        return createSwapQuote(apiClient, {
          ...options,
          taker: this.address, // Always use smart account's address as taker
          signerAddress: this.owners[0].address, // Always use owner's address as signer
          smartAccount: account, // Pass smart account for execute method support
        });
      } catch (error) {
        Analytics.trackError(error, "quoteSwap");
        throw error;
      }
    },
    async swap(options: SmartAccountSwapOptions): Promise<SmartAccountSwapResult> {
      Analytics.trackAction({
        action: "swap",
        accountType: "evm_smart",
        properties: {
          network: "network" in options ? options.network : undefined,
        },
      });
      try {
        return sendSwapOperation(apiClient, {
          ...options,
          smartAccount: account,
          taker: this.address, // Always use smart account's address as taker
          signerAddress: this.owners[0].address, // Always use owner's address as signer
        });
      } catch (error) {
        Analytics.trackError(error, "swap");
        throw error;
      }
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
      try {
        const chain = resolveNetworkToChain(options.network);

        const result = await signAndWrapTypedDataForSmartAccount(apiClient, {
          chainId: BigInt(chain.id),
          smartAccount: account,
          typedData: options,
        });

        const publicClient = createPublicClient({ chain, transport: http() });

        return wrapSignatureWithEip6492IfUndeployed(
          publicClient,
          account.address,
          account.owners[0].address,
          result.signature,
        );
      } catch (error) {
        Analytics.trackError(error, "signTypedData");
        throw error;
      }
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
      try {
        return useSpendPermission(apiClient, account, options);
      } catch (error) {
        Analytics.trackError(error, "useSpendPermission");
        throw error;
      }
    },

    name: options.smartAccount.name,
    type: "evm-smart",
    useNetwork: async <Network extends NetworkOrRpcUrl>(network: Network) => {
      Analytics.trackAction({
        action: "use_network",
        accountType: "evm_smart",
        properties: {
          network,
        },
      });
      try {
        return toNetworkScopedEvmSmartAccount(apiClient, {
          smartAccount: account,
          owner: options.owner,
          network,
        });
      } catch (error) {
        Analytics.trackError(error, "useNetwork");
        throw error;
      }
    },
  };

  return account;
}
