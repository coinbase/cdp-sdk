/**
 * @module Accounts
 */

import {
  ListTokenBalancesNetworks,
  RequestFaucetNetworks,
  TransferNetworks,
  SwapNetworks,
  QuoteSwapNetworks,
} from "./networkCapabilities.js";
import {
  ListTokenBalancesOptions,
  ListTokenBalancesResult,
} from "../../actions/evm/listTokenBalances.js";
import { RequestFaucetOptions, RequestFaucetResult } from "../../actions/evm/requestFaucet.js";
import { TransactionResult, SendTransactionOptions } from "../../actions/evm/sendTransaction.js";
import {
  SendUserOperationOptions,
  SendUserOperationReturnType,
} from "../../actions/evm/sendUserOperation.js";
import { UseSpendPermissionOptions } from "../../actions/evm/spend-permissions/types.js";
import {
  AccountSwapOptions,
  AccountSwapResult,
  AccountQuoteSwapOptions,
  AccountQuoteSwapResult,
  SmartAccountQuoteSwapOptions,
  SmartAccountSwapOptions,
  SmartAccountSwapResult,
  SmartAccountQuoteSwapResult,
} from "../../actions/evm/swap/types.js";
import {
  WaitForUserOperationOptions,
  WaitForUserOperationReturnType,
} from "../../actions/evm/waitForUserOperation.js";
import { GetUserOperationOptions, UserOperation } from "../../client/evm/evm.types.js";
import { SpendPermissionNetwork } from "../../openapi-client/index.js";

import type {
  SmartAccountTransferOptions,
  TransferOptions,
} from "../../actions/evm/transfer/types.js";
import type { AccountActions, SmartAccountActions } from "../../actions/evm/types.js";
import type { Address, Hash, Hex } from "../../types/misc.js";
import type { Prettify } from "../../types/utils.js";
import type {
  SignableMessage,
  TransactionReceipt,
  TransactionSerializable,
  TypedData,
  TypedDataDefinition,
  WaitForTransactionReceiptParameters,
} from "viem";

/** @internal */
export type DistributedOmit<T, K extends PropertyKey> = T extends any ? Omit<T, K> : never; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Base type for any Ethereum account with signing capabilities.
 * For example, this could be an EVM ServerAccount, or a viem LocalAccount.
 */
export type EvmAccount = {
  /** The address of the signer. */
  address: Address;
  /** Signs a message hash and returns the signature as a hex string. */
  sign: (parameters: { hash: Hash }) => Promise<Hex>;
  /** Signs a message and returns the signature as a hex string. */
  signMessage: (parameters: { message: SignableMessage }) => Promise<Hex>;
  /** Signs a transaction and returns the signed transaction as a hex string. */
  signTransaction: (transaction: TransactionSerializable) => Promise<Hex>;
  /** Signs a typed data and returns the signature as a hex string. */
  signTypedData: <
    const typedData extends TypedData | Record<string, unknown>,
    primaryType extends keyof typedData | "EIP712Domain" = keyof typedData,
  >(
    parameters: TypedDataDefinition<typedData, primaryType>,
  ) => Promise<Hex>;
  /** A list of Policy ID's that apply to the account. */
  policies?: string[];
};

/**
 * Known EVM networks supported by the SDK.
 *
 * @internal
 */
export type KnownEvmNetworks =
  | "base"
  | "base-sepolia"
  | "ethereum"
  | "ethereum-sepolia"
  | "ethereum-hoodi"
  | "polygon"
  | "polygon-mumbai"
  | "arbitrum"
  | "arbitrum-sepolia"
  | "optimism"
  | "optimism-sepolia";

/**
 * Network input that accepts known networks or RPC URLs
 *
 * @internal
 */
export type NetworkOrRpcUrl = KnownEvmNetworks | (string & {});

/**
 * Server-managed ethereum account
 */
export type EvmServerAccount = Prettify<
  EvmAccount &
    AccountActions & {
      /** Optional name for the server account. */
      name?: string;
      /** Indicates this is a server-managed account. */
      type: "evm-server";
      /**
       * A function that returns a network-scoped server-managed account.
       *
       * @param network - The network name or RPC URL
       * @example
       * // For known networks, type is inferred automatically:
       * const baseAccount = await account.useNetwork("base");
       *
       * // For custom RPC URLs with type hints (requires casting):
       * const typedAccount = await account.useNetwork<"base">("https://mainnet.base.org" as "base");
       *
       * // For custom RPC URLs without type hints (only sendTransaction and waitForTransactionReceipt methods available):
       * const customAccount = await account.useNetwork("https://mainnet.base.org");
       */
      useNetwork: <Network extends NetworkOrRpcUrl>(
        network: Network,
      ) => Promise<NetworkScopedEvmServerAccount<Network>>;
    }
>;

export type EvmSmartAccountProperties = {
  /** The smart account's address. */
  address: Address;
  /** The name of the smart account. */
  name?: string;
  /** Array of accounts that own and can sign for the smart account (currently only supports one owner but will be extended to support multiple owners in the future). */
  owners: EvmAccount[];
  /** Identifier for the smart account type. */
  type: "evm-smart";
  /** The list of policy IDs that apply to the smart account. This will include both the project-level policy and the account-level policy, if one exists. */
  policies: string[] | undefined;
  /**
   * A function that returns a network-scoped smart account.
   *
   * @param network - The network name or RPC URL
   * @example
   * // For known networks, type is inferred automatically:
   * const baseAccount = await smartAccount.useNetwork("base");
   *
   * // For custom RPC URLs with type hints (requires casting):
   * const typedAccount = await smartAccount.useNetwork<"base">("https://mainnet.base.org" as "base");
   *
   * // For custom RPC URLs without type hints (only sendTransaction, transfer and waitForTransactionReceipt methods available):
   * const customAccount = await smartAccount.useNetwork("https://mainnet.base.org");
   */
  useNetwork: <Network extends KnownEvmNetworks>(
    network: Network,
  ) => Promise<NetworkScopedEvmSmartAccount<Network>>;
};

/**
 * Ethereum smart account which supports account abstraction features like user operations, batch transactions, and paymaster.
 */
export type EvmSmartAccount = Prettify<EvmSmartAccountProperties & SmartAccountActions>;

/**
 * Helper type for network-specific smart account actions
 *
 * @internal
 */
export type NetworkSpecificSmartAccountActions<Network extends string> = Prettify<
  // Always include sendUserOperation, waitForUserOperation and getUserOperation
  {
    sendUserOperation: <const callData extends unknown[]>(
      options: Omit<SendUserOperationOptions<callData>, "smartAccount" | "network">,
    ) => Promise<SendUserOperationReturnType>;
    waitForUserOperation: (
      options: Omit<WaitForUserOperationOptions, "smartAccountAddress" | "network">,
    ) => Promise<WaitForUserOperationReturnType>;
    getUserOperation: (
      options: Omit<GetUserOperationOptions, "smartAccount" | "network">,
    ) => Promise<UserOperation>;
  } & (Network extends TransferNetworks
    ? {
        transfer: (
          options: Omit<SmartAccountTransferOptions, "network">,
        ) => Promise<SendUserOperationReturnType>;
      }
    : EmptyObject) &
    // Conditionally include listTokenBalances
    (Network extends ListTokenBalancesNetworks
      ? {
          listTokenBalances: (
            options: Omit<ListTokenBalancesOptions, "address" | "network">,
          ) => Promise<ListTokenBalancesResult>;
        }
      : EmptyObject) &
    // Conditionally include requestFaucet
    (Network extends RequestFaucetNetworks
      ? {
          requestFaucet: (
            options: Omit<RequestFaucetOptions, "address" | "network">,
          ) => Promise<RequestFaucetResult>;
        }
      : EmptyObject) &
    // Conditionally include quoteSwap
    (Network extends QuoteSwapNetworks
      ? {
          quoteSwap: (
            options: DistributedOmit<SmartAccountQuoteSwapOptions, "network">,
          ) => Promise<SmartAccountQuoteSwapResult>;
        }
      : EmptyObject) &
    // Conditionally include swap
    (Network extends SwapNetworks
      ? {
          swap: (
            options: DistributedOmit<SmartAccountSwapOptions, "network">,
          ) => Promise<SmartAccountSwapResult>;
        }
      : EmptyObject) &
    // Conditionally include useSpendPermission
    (Network extends SpendPermissionNetwork
      ? {
          useSpendPermission: (
            options: Omit<UseSpendPermissionOptions, "network">,
          ) => Promise<SendUserOperationReturnType>;
        }
      : EmptyObject)
>;

/**
 * A network-scoped smart account
 *
 * @internal
 */
export type NetworkScopedEvmSmartAccount<Network extends string = string> = Prettify<
  Omit<EvmSmartAccountProperties, "useNetwork"> &
    NetworkSpecificSmartAccountActions<Network> & {
      /** The network this account is scoped to */
      network: Network;
    }
>;

/**
 * Helper type to surface a TypeError when calling a method that doesn't exist based on the network
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type EmptyObject = {};

/**
 * Conditional account actions based on network
 *
 * @internal
 */
export type NetworkSpecificAccountActions<Network extends string> = Prettify<
  // Always include sendTransaction, transfer and waitForTransactionReceipt
  {
    sendTransaction: (
      options: Omit<SendTransactionOptions, "address" | "network">,
    ) => Promise<TransactionResult>;
    transfer: (options: Omit<TransferOptions, "address" | "network">) => Promise<TransactionResult>;
    waitForTransactionReceipt: (
      options: WaitForTransactionReceiptParameters | TransactionResult,
    ) => Promise<TransactionReceipt>;
  } & (Network extends ListTokenBalancesNetworks // Conditionally include listTokenBalances
    ? {
        listTokenBalances: (
          options: Omit<ListTokenBalancesOptions, "address" | "network">,
        ) => Promise<ListTokenBalancesResult>;
      }
    : EmptyObject) &
    // Conditionally include requestFaucet
    (Network extends RequestFaucetNetworks
      ? {
          requestFaucet: (
            options: Omit<RequestFaucetOptions, "address" | "network">,
          ) => Promise<RequestFaucetResult>;
        }
      : EmptyObject) &
    // Conditionally include transfer
    (Network extends TransferNetworks
      ? {
          transfer: (options: TransferOptions) => Promise<{ transactionHash: Hex }>;
        }
      : EmptyObject) &
    // Conditionally include quoteSwap
    (Network extends QuoteSwapNetworks
      ? {
          quoteSwap: (
            options: DistributedOmit<AccountQuoteSwapOptions, "network">,
          ) => Promise<AccountQuoteSwapResult>;
        }
      : EmptyObject) &
    // Conditionally include swap
    (Network extends SwapNetworks
      ? {
          swap: (
            options: DistributedOmit<AccountSwapOptions, "network">,
          ) => Promise<AccountSwapResult>;
        }
      : EmptyObject) &
    // Conditionally include useSpendPermission
    (Network extends SpendPermissionNetwork
      ? {
          useSpendPermission: (
            options: Omit<UseSpendPermissionOptions, "network">,
          ) => Promise<TransactionResult>;
        }
      : EmptyObject)
>;

/**
 * A network-scoped server-managed ethereum account
 *
 * @internal
 */
export type NetworkScopedEvmServerAccount<Network extends string = string> = Prettify<
  Omit<EvmServerAccount, keyof AccountActions | "useNetwork"> &
    NetworkSpecificAccountActions<Network> & {
      /** The network this account is scoped to */
      network: Network;
    }
>;
