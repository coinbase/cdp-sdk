import {
  Hex,
  TransactionReceipt,
  Address,
  PublicClient,
  Chain,
  Transport,
  WaitForTransactionReceiptParameters,
} from "viem";

import {
  CdpOpenApiClientType,
  EvmUserOperationNetwork,
  SendEvmTransactionBodyNetwork,
} from "../../../openapi-client/index.js";

import type { EvmAccount, EvmSmartAccount } from "../../../accounts/evm/types.js";
import type { WaitForUserOperationOptions } from "../waitForUserOperation.js";

/**
 * The network to transfer the token on.
 */
export type Network = SendEvmTransactionBodyNetwork | EvmUserOperationNetwork;

/**
 * The options for the transfer.
 */
export type TransferOptions = {
  /** The account to transfer the token to. */
  to: EvmAccount | Address;
  /**
   * The amount of the token to transfer.
   * If a string is provided, it will be parsed into a bigint based on the token's decimals.
   */
  amount: bigint | string;
  /** The token to transfer. Can be a contract address or a predefined token name. */
  token: "eth" | "usdc" | Hex;
  /** The network to transfer the token on. */
  network: Network;
};

/**
 * The options for the transfer using an account.
 */
export type AccountTransferOptions = TransferOptions & {
  /** The options for waiting for the result of the transfer. */
  waitOptions?: {
    /**
     * Polling frequency (in seconds). Defaults to 4 seconds.
     */
    intervalSeconds?: WaitForTransactionReceiptParameters["pollingInterval"];
    /**
     * Optional timeout (in seconds) to wait before stopping polling. Defaults to 180 seconds.
     */
    timeoutSeconds?: WaitForTransactionReceiptParameters["timeout"];
  };
};

/**
 * The options for the transfer using a smart account.
 */
export type SmartAccountTransferOptions = TransferOptions & {
  /** The paymaster URL to use for the transfer. */
  paymasterUrl?: string;
  /** The options for waiting for the result of the transfer. */
  waitOptions?: WaitForUserOperationOptions["waitOptions"];
};

/**
 * The result of the transfer.
 */
export type TransferResult = {
  /** The status of the transaction. */
  status: TransactionReceipt["status"];
  /** The transaction hash of the transfer. */
  transactionHash: Hex;
};

/**
 * A strategy for executing a transfer.
 */
export interface TransferExecutionStrategy<T extends EvmAccount | EvmSmartAccount> {
  /**
   * Executes the transfer.
   *
   * @param args - The arguments for the transfer.
   * @param args.apiClient - The API client to use for the transfer.
   * @param args.from - The account to transfer the token from.
   * @param args.to - The account to transfer the token to.
   * @param args.value - The value of the transfer.
   * @param args.token - The token to transfer.
   * @param args.network - The network to transfer the token on.
   * @returns The transaction hash of the transfer.
   */
  executeTransfer(
    args: {
      apiClient: CdpOpenApiClientType;
      from: T;
      to: Address;
      value: bigint;
      token: TransferOptions["token"];
      network: TransferOptions["network"];
    } & (T extends EvmSmartAccount ? { paymasterUrl?: string } : object),
  ): Promise<Hex>;

  /**
   * Waits for the result of the transfer.
   *
   * @param args - The arguments for the transfer.
   * @param args.apiClient - The API client to use for the transfer.
   * @param args.publicClient - The public client to use for the transfer.
   * @param args.from - The account to transfer the token from.
   * @param args.hash - The transaction hash of the transfer.
   * @param args.waitOptions - The options for waiting for the result of the transfer.
   * @returns The result of the transfer.
   */
  waitForResult(args: {
    apiClient: CdpOpenApiClientType;
    publicClient: PublicClient<Transport, Chain>;
    from: T;
    hash: Hex;
    waitOptions?: WaitForUserOperationOptions["waitOptions"];
  }): Promise<TransferResult>;
}
