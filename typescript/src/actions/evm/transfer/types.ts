import { Hex, TransactionReceipt, Address, PublicClient, Chain, Transport } from "viem";

import {
  CdpOpenApiClientType,
  EvmAccount,
  EvmUserOperationNetwork,
  SendEvmTransactionBodyNetwork,
} from "../../../openapi-client/index.js";

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
export interface TransferExecutionStrategy<T> {
  /**
   * Executes the transfer.
   *
   * @param args - The arguments for the transfer.
   * @param args.apiClient - The API client to use for the transfer.
   * @param args.from - The account to transfer the token from.
   * @param args.transferArgs - The arguments for the transfer.
   * @param args.to - The account to transfer the token to.
   * @param args.value - The value of the transfer.
   * @returns The transaction hash of the transfer.
   */
  executeTransfer(args: {
    apiClient: CdpOpenApiClientType;
    from: T;
    transferArgs: TransferOptions;
    to: Address;
    value: bigint;
  }): Promise<Hex>;

  /**
   * Waits for the result of the transfer.
   *
   * @param args - The arguments for the transfer.
   * @param args.apiClient - The API client to use for the transfer.
   * @param args.publicClient - The public client to use for the transfer.
   * @param args.from - The account to transfer the token from.
   * @param args.hash - The transaction hash of the transfer.
   * @returns The result of the transfer.
   */
  waitForResult(args: {
    apiClient: CdpOpenApiClientType;
    publicClient: PublicClient<Transport, Chain>;
    from: T;
    hash: Hex;
  }): Promise<TransferResult>;
}
