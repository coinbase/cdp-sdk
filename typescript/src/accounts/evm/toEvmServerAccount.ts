import {
  type TransactionSerializable,
  type TypedDataDefinition,
  type TypedData,
  type HashTypedDataParameters,
  getTypesForEIP712Domain,
  serializeTransaction,
  hashMessage,
} from "viem";

import { toNetworkScopedEvmServerAccount } from "./toNetworkScopedEvmServerAccount.js";
import {
  listTokenBalances,
  type ListTokenBalancesResult,
  type ListTokenBalancesOptions,
} from "../../actions/evm/listTokenBalances.js";
import {
  requestFaucet,
  type RequestFaucetOptions,
  type RequestFaucetResult,
} from "../../actions/evm/requestFaucet.js";
import { sendTransaction } from "../../actions/evm/sendTransaction.js";
import { useSpendPermission } from "../../actions/evm/spend-permissions/account.use.js";
import { UseSpendPermissionOptions } from "../../actions/evm/spend-permissions/types.js";
import { createSwapQuote } from "../../actions/evm/swap/createSwapQuote.js";
import { sendSwapTransaction } from "../../actions/evm/swap/sendSwapTransaction.js";
import { accountTransferStrategy } from "../../actions/evm/transfer/accountTransferStrategy.js";
import { transfer } from "../../actions/evm/transfer/transfer.js";
import { Analytics } from "../../analytics.js";

import type { EvmServerAccount, NetworkOrRpcUrl } from "./types.js";
import type {
  SendTransactionOptions,
  TransactionResult,
} from "../../actions/evm/sendTransaction.js";
import type {
  AccountSwapOptions,
  AccountSwapResult,
  AccountQuoteSwapOptions,
  AccountQuoteSwapResult,
} from "../../actions/evm/swap/types.js";
import type { CdpOpenApiClientType, EvmAccount } from "../../openapi-client/index.js";
import type { Address, EIP712Domain, Hash, Hex } from "../../types/misc.js";

/**
 * Options for converting a pre-existing EvmAccount to a EvmServerAccount.
 */
export type ToEvmServerAccountOptions = {
  /** The EvmAccount that was previously created. */
  account: EvmAccount;
};

/**
 * Creates a Server-managed EvmAccount instance from an existing EvmAccount.
 * Use this to interact with previously deployed EvmAccounts, rather than creating new ones.
 *
 * @param {CdpOpenApiClientType} apiClient - The API client.
 * @param {ToEvmServerAccountOptions} options - Configuration options.
 * @param {EvmAccount} options.account - The EvmAccount that was previously created.
 * @returns {EvmServerAccount} A configured EvmAccount instance ready for signing.
 */
export function toEvmServerAccount(
  apiClient: CdpOpenApiClientType,
  options: ToEvmServerAccountOptions,
): EvmServerAccount {
  const account: EvmServerAccount = {
    address: options.account.address as Address,
    async signMessage({ message }) {
      Analytics.trackAction({
        action: "sign_message",
        accountType: "evm_server",
      });

      if (typeof message === "string") {
        const result = await apiClient.signEvmMessage(options.account.address, {
          message,
        });
        return result.signature as Hex;
      }

      const result = await apiClient.signEvmHash(options.account.address, {
        hash: hashMessage(message),
      });
      return result.signature as Hex;
    },

    async sign(parameters: { hash: Hash }) {
      Analytics.trackAction({
        action: "sign",
        accountType: "evm_server",
      });

      const result = await apiClient.signEvmHash(options.account.address, {
        hash: parameters.hash,
      });
      return result.signature as Hex;
    },

    async signTransaction(transaction: TransactionSerializable) {
      Analytics.trackAction({
        action: "sign_transaction",
        accountType: "evm_server",
      });

      const result = await apiClient.signEvmTransaction(options.account.address, {
        transaction: serializeTransaction(transaction),
      });
      return result.signedTransaction as Hex;
    },

    async signTypedData<
      const typedData extends TypedData | Record<string, unknown>,
      primaryType extends keyof typedData | "EIP712Domain" = keyof typedData,
    >(parameters: TypedDataDefinition<typedData, primaryType>) {
      Analytics.trackAction({
        action: "sign_typed_data",
        accountType: "evm_server",
      });

      const { domain = {}, message, primaryType } = parameters as HashTypedDataParameters;
      const types = {
        EIP712Domain: getTypesForEIP712Domain({ domain }),
        ...parameters.types,
      };

      const openApiMessage = {
        domain: domain as EIP712Domain,
        types,
        primaryType,
        message,
      };

      const result = await apiClient.signEvmTypedData(options.account.address, openApiMessage);
      return result.signature as Hex;
    },
    async transfer(transferArgs): Promise<TransactionResult> {
      Analytics.trackAction({
        action: "transfer",
        accountType: "evm_server",
        properties: {
          network: transferArgs.network,
        },
      });

      return transfer(apiClient, account, transferArgs, accountTransferStrategy);
    },
    async listTokenBalances(
      options: Omit<ListTokenBalancesOptions, "address">,
    ): Promise<ListTokenBalancesResult> {
      Analytics.trackAction({
        action: "list_token_balances",
        accountType: "evm_server",
        properties: {
          network: options.network,
        },
      });

      return listTokenBalances(apiClient, {
        ...options,
        address: this.address,
      });
    },
    async requestFaucet(
      options: Omit<RequestFaucetOptions, "address">,
    ): Promise<RequestFaucetResult> {
      Analytics.trackAction({
        action: "request_faucet",
        accountType: "evm_server",
        properties: {
          network: options.network,
        },
      });

      return requestFaucet(apiClient, {
        ...options,
        address: this.address,
      });
    },
    async sendTransaction(options: Omit<SendTransactionOptions, "address">) {
      Analytics.trackAction({
        action: "send_transaction",
        accountType: "evm_server",
        properties: {
          network: options.network,
        },
      });

      return sendTransaction(apiClient, {
        ...options,
        address: this.address,
      });
    },
    async quoteSwap(options: AccountQuoteSwapOptions): Promise<AccountQuoteSwapResult> {
      Analytics.trackAction({
        action: "quote_swap",
        accountType: "evm_server",
        properties: {
          network: options.network,
        },
      });

      return createSwapQuote(apiClient, {
        ...options,
        taker: this.address,
      });
    },
    async swap(options: AccountSwapOptions): Promise<AccountSwapResult> {
      Analytics.trackAction({
        action: "swap",
        accountType: "evm_server",
        properties: {
          network: "network" in options ? options.network : undefined,
        },
      });

      return sendSwapTransaction(apiClient, {
        ...options,
        address: this.address,
        taker: this.address, // Always use account's address as taker
      });
    },
    async useSpendPermission(options: UseSpendPermissionOptions): Promise<TransactionResult> {
      Analytics.trackAction({
        action: "use_spend_permission",
        accountType: "evm_server",
        properties: {
          network: options.network,
        },
      });

      return useSpendPermission(apiClient, this.address, options);
    },
    name: options.account.name,
    type: "evm-server",
    policies: options.account.policies,
    useNetwork: async <Network extends NetworkOrRpcUrl>(networkOrRpcUrl: Network) => {
      Analytics.trackAction({
        action: "use_network",
        accountType: "evm_server",
        properties: {
          network: networkOrRpcUrl,
        },
      });

      return toNetworkScopedEvmServerAccount({
        account,
        network: networkOrRpcUrl,
      });
    },
  };

  return account;
}
