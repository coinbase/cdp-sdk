import type { AccountActions, SmartAccountActions } from "../../actions/evm/types.js";
import type { Address, Hash, Hex } from "../../types/misc.js";
import type { Prettify } from "../../types/utils.js";
import type {
  SignableMessage,
  TransactionSerializable,
  TypedData,
  TypedDataDefinition,
} from "viem";

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
 * Server-managed ethereum account
 */
export type EvmServerAccount = Prettify<
  EvmAccount &
    AccountActions & {
      /** Optional name for the server account. */
      name?: string;
      /** Indicates this is a server-managed account. */
      type: "evm-server";
      /** Subject to breaking changes. A function that returns a network-scoped server-managed account. */
      __experimental_useNetwork: (network: string) => Promise<NetworkScopedEvmServerAccount>;
    }
>;

type EvmSmartAccountProperties = {
  /** The smart account's address. */
  address: Address;
  /** The name of the smart account. */
  name?: string;
  /** Array of accounts that own and can sign for the smart account (currently only supports one owner but will be extended to support multiple owners in the future). */
  owners: EvmAccount[];
  /** Identifier for the smart account type. */
  type: "evm-smart";
  /** Subject to breaking changes. A function that returns a network-scoped smart account. */
  __experimental_useNetwork: (network: string) => Promise<NetworkScopedEvmSmartAccount>;
};

/**
 * Ethereum smart account which supports account abstraction features like user operations, batch transactions, and paymaster.
 */
export type EvmSmartAccount = Prettify<EvmSmartAccountProperties & SmartAccountActions>;

export type NetworkScopedEvmSmartAccount = Prettify<
  Omit<EvmSmartAccountProperties, "__experimental_useNetwork"> & {
    /** The network to scope the smart account object to. */
    network: string;
  }
>;

/**
 * A network-scoped server-managed ethereum account
 */
export type NetworkScopedEvmServerAccount = Prettify<
  Omit<EvmServerAccount, keyof AccountActions | "__experimental_useNetwork"> & {
    /** The network this account is scoped to */
    network: string;
  }
>;
