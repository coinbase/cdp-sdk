import {
  type TransactionSerializable,
  type TypedDataDefinition,
  type TypedData,
  type HashTypedDataParameters,
  getTypesForEIP712Domain,
  serializeTransaction,
} from "viem";

import { toNetworkScopedEvmServerAccount } from "./toNetworkScopedEvmServerAccount.js";
import { FundOptions, fund } from "../../actions/evm/fund/fund.js";
import { Quote } from "../../actions/evm/fund/Quote.js";
import { QuoteFundOptions, quoteFund } from "../../actions/evm/fund/quoteFund.js";
import { FundOperationResult } from "../../actions/evm/fund/types.js";
import {
  WaitForFundOperationOptions,
  WaitForFundOperationResult,
  waitForFundOperationReceipt,
} from "../../actions/evm/fund/waitForFundOperationReceipt.js";
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
import { createSwapQuote } from "../../actions/evm/swap/createSwapQuote.js";
import { sendSwapTransaction } from "../../actions/evm/swap/sendSwapTransaction.js";
import { accountTransferStrategy } from "../../actions/evm/transfer/accountTransferStrategy.js";
import { transfer } from "../../actions/evm/transfer/transfer.js";

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
      const result = await apiClient.signEvmMessage(options.account.address, {
        message: message.toString(),
      });
      return result.signature as Hex;
    },

    async sign(parameters: { hash: Hash }) {
      const result = await apiClient.signEvmHash(options.account.address, {
        hash: parameters.hash,
      });
      return result.signature as Hex;
    },

    async signTransaction(transaction: TransactionSerializable) {
      const result = await apiClient.signEvmTransaction(options.account.address, {
        transaction: serializeTransaction(transaction),
      });
      return result.signedTransaction as Hex;
    },

    async signTypedData<
      const typedData extends TypedData | Record<string, unknown>,
      primaryType extends keyof typedData | "EIP712Domain" = keyof typedData,
    >(parameters: TypedDataDefinition<typedData, primaryType>) {
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
      return transfer(apiClient, account, transferArgs, accountTransferStrategy);
    },
    async listTokenBalances(
      options: Omit<ListTokenBalancesOptions, "address">,
    ): Promise<ListTokenBalancesResult> {
      return listTokenBalances(apiClient, {
        ...options,
        address: this.address,
      });
    },
    async requestFaucet(
      options: Omit<RequestFaucetOptions, "address">,
    ): Promise<RequestFaucetResult> {
      return requestFaucet(apiClient, {
        ...options,
        address: this.address,
      });
    },
    async sendTransaction(options: Omit<SendTransactionOptions, "address">) {
      return sendTransaction(apiClient, {
        ...options,
        address: this.address,
      });
    },
    async quoteFund(options: Omit<QuoteFundOptions, "address">): Promise<Quote> {
      return quoteFund(apiClient, {
        ...options,
        address: this.address,
      });
    },
    async fund(options: Omit<FundOptions, "address">): Promise<FundOperationResult> {
      return fund(apiClient, {
        ...options,
        address: this.address,
      });
    },
    async waitForFundOperationReceipt(
      options: WaitForFundOperationOptions,
    ): Promise<WaitForFundOperationResult> {
      return waitForFundOperationReceipt(apiClient, options);
    },
    async quoteSwap(options: AccountQuoteSwapOptions): Promise<AccountQuoteSwapResult> {
      return createSwapQuote(apiClient, {
        ...options,
        taker: this.address,
      });
    },
    async swap(options: AccountSwapOptions): Promise<AccountSwapResult> {
      return sendSwapTransaction(apiClient, {
        ...options,
        address: this.address,
        taker: this.address, // Always use account's address as taker
      });
    },
    name: options.account.name,
    type: "evm-server",
    policies: options.account.policies,
    useNetwork: async <Network extends NetworkOrRpcUrl>(networkOrRpcUrl: Network) => {
      return toNetworkScopedEvmServerAccount({
        account,
        network: networkOrRpcUrl,
      });
    },
  };

  return account;
}
