import type { EvmAccount, EvmSmartAccount } from "../../../accounts/evm/types.js";
import type {
  CdpOpenApiClientType,
  EvmUserOperationNetwork,
  SendEvmTransactionBodyNetwork,
} from "../../../openapi-client/index.js";
import type { TransactionResult } from "../sendTransaction.js";
import type { SendUserOperationReturnType } from "../sendUserOperation.js";
import type { Hex, Address } from "viem";

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
   * The amount of the token to transfer, represented as an atomic value.
   */
  amount: bigint;
  /** The token to transfer. Can be a contract address or a predefined token name. */
  token: "eth" | "usdc" | Hex;
  /** The network to transfer the token on. */
  network: Network;
};

/**
 * The options for the transfer using a smart account.
 */
export type SmartAccountTransferOptions = TransferOptions & {
  /** The paymaster URL to use for the transfer. */
  paymasterUrl?: string;
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
  ): Promise<T extends EvmSmartAccount ? SendUserOperationReturnType : TransactionResult>;
}
