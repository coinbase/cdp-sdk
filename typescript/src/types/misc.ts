// Adapted from viem (https://github.com/wevm/viem)

export type Hex = `0x${string}`;
export type Hash = `0x${string}`;
export type Address = `0x${string}`;

export type AccessList = readonly {
  address: Address;
  storageKeys: readonly Hex[];
}[];

export type TransactionRequestEIP1559 = {
  /** The address of the contract or account to send the transaction to. */
  to: Address;
  /** The amount of ETH, in wei, to send with the transaction. */
  value?: bigint | undefined;
  /** The data to send with the transaction; only used for contract calls. */
  data?: Hex | undefined;
  /** The amount of gas to use for the transaction. */
  gas?: bigint | undefined;
  /**
   * The nonce to use for the transaction.
   * If not provided, the API will assign a nonce to the transaction based on the current state of the account.
   */
  nonce?: number | undefined;
  /**
   * The maximum fee per gas to use for the transaction.
   * If not provided, the API will estimate a value based on current network conditions.
   */
  maxFeePerGas?: bigint | undefined;
  /**
   * The maximum priority fee per gas to use for the transaction.
   * If not provided, the API will estimate a value based on current network conditions.
   */
  maxPriorityFeePerGas?: bigint | undefined;
  /** The access list to use for the transaction. */
  accessList?: AccessList | undefined;
  /** (Ignored) The value of the `chainId` field in the transaction is ignored. */
  chainId?: number | undefined;
  /** (Ignored) Ignored in favor of the account address that is sending the transaction. */
  from?: Address | undefined;
  /** (Ignored) The transaction type is always `eip1559`. */
  type?: "eip1559" | undefined;
};

/**
 * The domain of the EIP-712 typed data.
 */
export interface EIP712Domain {
  /** The name of the DApp or protocol. */
  name?: string;
  /** The version of the DApp or protocol. */
  version?: string;
  /** The chain ID of the EVM network. */
  chainId?: number;
  /** The 0x-prefixed EVM address of the verifying smart contract. */
  verifyingContract?: Hex;
  /** The optional 32-byte 0x-prefixed hex salt for domain separation. */
  salt?: Hex;
}

/**
 * A mapping of struct names to an array of type objects (name + type).
 * Each key corresponds to a type name (e.g., "`EIP712Domain`", "`PermitTransferFrom`").
 */
export interface EIP712Types {
  [key: string]: unknown;
}

/**
 * The message to sign. The structure of this message must match the `primaryType` struct in the `types` object.
 */
export type EIP712MessageMessage = { [key: string]: unknown };

/**
 * The message to sign using EIP-712.
 */
export interface EIP712Message {
  domain: EIP712Domain;
  types: EIP712Types;
  /** The primary type of the message. This is the name of the struct in the `types` object that is the root of the message. */
  primaryType: string;
  /** The message to sign. The structure of this message must match the `primaryType` struct in the `types` object. */
  message: EIP712MessageMessage;
}
