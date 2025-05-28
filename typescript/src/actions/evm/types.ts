import { SendUserOperationOptions, SendUserOperationReturnType } from "./sendUserOperation.js";
import { GetUserOperationOptions, UserOperation } from "../../client/evm/evm.types.js";
import { Hex } from "../../types/misc.js";

import type { ListTokenBalancesOptions, ListTokenBalancesResult } from "./listTokenBalances.js";
import type { RequestFaucetOptions, RequestFaucetResult } from "./requestFaucet.js";
import type { SendTransactionOptions, TransactionResult } from "./sendTransaction.js";
import type { TransferOptions } from "./transfer/types.js";
import type {
  WaitForUserOperationOptions,
  WaitForUserOperationReturnType,
} from "./waitForUserOperation.js";

type Actions = {
  /**
   * List the token balances of an account.
   *
   * @param options - The options for the list token balances.
   * @param options.network - The network to list the token balances on.
   *
   * @returns The result of the list token balances.
   *
   * @example
   * ```typescript
   * const balances = await account.listTokenBalances({
   *   network: "base-sepolia",
   * });
   * ```
   */
  listTokenBalances: (
    options: Omit<ListTokenBalancesOptions, "address">,
  ) => Promise<ListTokenBalancesResult>;

  /**
   * Requests funds from an EVM faucet.
   *
   * @param {RequestFaucetOptions} options - Parameters for requesting funds from the EVM faucet.
   * @param {string} options.network - The network to request funds from.
   * @param {string} options.token - The token to request funds for.
   * @param {string} [options.idempotencyKey] - An idempotency key.
   *
   * @returns A promise that resolves to the transaction hash.
   *
   * @example
   * ```ts
   * const result = await account.requestFaucet({
   *   network: "base-sepolia",
   *   token: "eth",
   * });
   * ```
   */
  requestFaucet: (options: Omit<RequestFaucetOptions, "address">) => Promise<RequestFaucetResult>;
};

export type AccountActions = Actions & {
  /**
   * Transfer an amount of a token from an account to another account.
   *
   * @param options - The options for the transfer.
   * @param options.to - The account or 0x-prefixed address to transfer the token to.
   * @param options.amount - The amount of the token to transfer represented as an atomic unit.
   * It's common to use `parseEther` or `parseUnits` utils from viem to convert to atomic units.
   * Otherwise, you can pass atomic units directly. See examples below.
   * @param options.token - The token to transfer. This can be 'eth', 'usdc', or a contract address.
   * @param options.network - The network to transfer the token on.
   *
   * @returns An object containing the transaction hash.
   *
   * @example
   * ```typescript
   * const { transactionHash } = await sender.transfer({
   *   to: "0x9F663335Cd6Ad02a37B633602E98866CF944124d",
   *   amount: 10000n, // equivalent to 0.01 USDC
   *   token: "usdc",
   *   network: "base-sepolia",
   * });
   * ```
   *
   * @example
   * **Using parseUnits to specify USDC amount**
   * ```typescript
   * import { parseUnits } from "viem";
   *
   * const { transactionHash } = await sender.transfer({
   *   to: "0x9F663335Cd6Ad02a37B633602E98866CF944124d",
   *   amount: parseUnits("0.01", 6), // USDC uses 6 decimal places
   *   token: "usdc",
   *   network: "base-sepolia",
   * });
   * ```
   *
   * @example
   * **Transfer ETH**
   * ```typescript
   * import { parseEther } from "viem";
   *
   * const { transactionHash } = await sender.transfer({
   *   to: "0x9F663335Cd6Ad02a37B633602E98866CF944124d",
   *   amount: parseEther("0.000001"),
   *   token: "eth",
   *   network: "base-sepolia",
   * });
   * ```
   *
   * @example
   * **Using a contract address**
   * ```typescript
   * import { parseEther } from "viem";
   *
   * const { transactionHash } = await sender.transfer({
   *   to: "0x9F663335Cd6Ad02a37B633602E98866CF944124d",
   *   amount: parseEther("0.000001"),
   *   token: "0x4200000000000000000000000000000000000006", // WETH on Base Sepolia
   *   network: "base-sepolia",
   * });
   * ```
   *
   * @example
   * **Transfer to another account**
   * ```typescript
   * const sender = await cdp.evm.createAccount({ name: "Sender" });
   * const receiver = await cdp.evm.createAccount({ name: "Receiver" });
   *
   * const { transactionHash } = await sender.transfer({
   *   to: receiver,
   *   amount: 10000n, // equivalent to 0.01 USDC
   *   token: "usdc",
   *   network: "base-sepolia",
   * });
   * ```
   */
  transfer: (options: TransferOptions) => Promise<{ transactionHash: Hex }>;

  /**
   * Signs an EVM transaction and sends it to the specified network using the Coinbase API.
   * This method handles nonce management and gas estimation automatically.
   *
   * @param {SendTransactionOptions} options - Configuration options for sending the transaction.
   * @returns A promise that resolves to the transaction hash.
   *
   * @example
   * **Sending an RLP-encoded transaction**
   * ```ts
   * import { parseEther, serializeTransaction } from "viem";
   * import { baseSepolia } from "viem/chains";
   *
   * const { transactionHash } = await account.sendTransaction({
   *   transaction: serializeTransaction({
   *     to: "0x4252e0c9A3da5A2700e7d91cb50aEf522D0C6Fe8",
   *     value: parseEther("0.000001"),
   *     chainId: baseSepolia.id,
   *     // Fields below are optional, CDP API will populate them if omitted.
   *     // nonce
   *     // maxPriorityFeePerGas
   *     // maxFeePerGas
   *     // gas
   *   }),
   *   network: "base-sepolia",
   * });
   * ```
   * @example
   * **Sending an EIP-1559 transaction request object**
   * ```ts
   * const { transactionHash } = await account.sendTransaction({
   *   transaction: {
   *     to: "0x4252e0c9A3da5A2700e7d91cb50aEf522D0C6Fe8",
   *     value: parseEther("0.000001"),
   *     // Fields below are optional, CDP API will populate them if omitted.
   *     // nonce
   *     // maxPriorityFeePerGas
   *     // maxFeePerGas
   *     // gas
   *   },
   *   network: "base-sepolia",
   * });
   * ```
   */
  sendTransaction: (options: Omit<SendTransactionOptions, "address">) => Promise<TransactionResult>;
};

export type SmartAccountActions = Actions & {
  /**
   * Transfer an amount of a token from an account to another account.
   *
   * @param options - The options for the transfer.
   * @param options.to - The account or 0x-prefixed address to transfer the token to.
   * @param options.amount - The amount of the token to transfer represented as an atomic unit.
   * It's common to use `parseEther` or `parseUnits` utils from viem to convert to atomic units.
   * Otherwise, you can pass atomic units directly. See examples below.
   * @param options.token - The token to transfer. This can be 'eth', 'usdc', or a contract address.
   * @param options.network - The network to transfer the token on.
   *
   * @returns The user operation result.
   *
   * @example
   * ```typescript
   * const { userOpHash } = await sender.transfer({
   *   to: "0x9F663335Cd6Ad02a37B633602E98866CF944124d",
   *   amount: 10000n, // equivalent to 0.01 USDC
   *   token: "usdc",
   *   network: "base-sepolia",
   * });
   * ```
   *
   * @example
   * **Using parseUnits to specify USDC amount**
   * ```typescript
   * import { parseUnits } from "viem";
   *
   * const { userOpHash } = await sender.transfer({
   *   to: "0x9F663335Cd6Ad02a37B633602E98866CF944124d",
   *   amount: parseUnits("0.01", 6), // USDC uses 6 decimal places
   *   token: "usdc",
   *   network: "base-sepolia",
   * });
   * ```
   *
   * @example
   * **Transfer ETH**
   * ```typescript
   * import { parseEther } from "viem";
   *
   * const { userOpHash } = await sender.transfer({
   *   to: "0x9F663335Cd6Ad02a37B633602E98866CF944124d",
   *   amount: parseEther("0.000001"),
   *   token: "eth",
   *   network: "base-sepolia",
   * });
   * ```
   *
   * @example
   * **Using a contract address**
   * ```typescript
   * import { parseEther } from "viem";
   *
   * const { userOpHash } = await sender.transfer({
   *   to: "0x9F663335Cd6Ad02a37B633602E98866CF944124d",
   *   amount: parseEther("0.000001"),
   *   token: "0x4200000000000000000000000000000000000006", // WETH on Base Sepolia
   *   network: "base-sepolia",
   * });
   * ```
   *
   * @example
   * **Transfer to another account**
   * ```typescript
   * const sender = await cdp.evm.createAccount({ name: "Sender" });
   * const receiver = await cdp.evm.createAccount({ name: "Receiver" });
   *
   * const { userOpHash } = await sender.transfer({
   *   to: receiver,
   *   amount: 10000n, // equivalent to 0.01 USDC
   *   token: "usdc",
   *   network: "base-sepolia",
   * });
   * ```
   */
  transfer: (options: TransferOptions) => Promise<SendUserOperationReturnType>;

  /**
   * Sends a user operation.
   *
   * @param {SendUserOperationOptions} options - Parameters for sending the user operation.
   * @param {string} options.network - The network to send the user operation on.
   * @param {EvmCall[]} options.calls - The calls to include in the user operation.
   * @param {string} [options.paymasterUrl] - The optional paymaster URL to use for the user operation.
   * @param {string} [options.idempotencyKey] - An idempotency key.
   *
   * @returns A promise that resolves to an object containing the smart account address,
   * the user operation hash, and the status of the user operation.
   *
   * @example
   * ```ts
   * const userOp = await smartAccount.sendUserOperation({
   *   network: "base-sepolia",
   *   calls: [
   *     {
   *       to: "0x1234567890123456789012345678901234567890",
   *       value: parseEther("0.000001"),
   *       data: "0x",
   *     },
   *   ],
   * });
   * ```
   */
  sendUserOperation: (
    options: Omit<SendUserOperationOptions<unknown[]>, "smartAccount">,
  ) => Promise<SendUserOperationReturnType>;

  /**
   * Waits for a user operation to complete or fail.
   *
   * @param {WaitForUserOperationOptions} options - Parameters for waiting for the user operation.
   * @param {string} options.userOpHash - The user operation hash.
   * @param {WaitOptions} [options.waitOptions] - Optional parameters for the wait operation.
   *
   * @returns A promise that resolves to the transaction receipt.
   *
   * @example
   * ```ts
   * // Send a user operation and get the user operation hash
   * const { userOpHash } = await smartAccount.sendUserOperation({
   *   network: "base-sepolia",
   *   calls: [
   *     {
   *       to: "0x0000000000000000000000000000000000000000",
   *       value: parseEther("0.000001"),
   *       data: "0x",
   *     },
   *   ],
   * });
   *
   * // Wait for the user operation to complete or fail
   * const result = await smartAccount.waitForUserOperation({
   *   userOpHash: userOp.userOpHash,
   * });
   * ```
   */
  waitForUserOperation: (
    options: Omit<WaitForUserOperationOptions, "smartAccountAddress">,
  ) => Promise<WaitForUserOperationReturnType>;

  /**
   * Gets a user operation by its hash.
   *
   * @param {GetUserOperationOptions} options - Parameters for getting the user operation.
   * @param {string} options.userOpHash - The user operation hash.
   *
   * @returns A promise that resolves to the user operation.
   *
   * @example
   * ```ts
   * const userOp = await smartAccount.getUserOperation({
   *   userOpHash: "0x1234567890123456789012345678901234567890",
   * });
   * ```
   */
  getUserOperation: (
    options: Omit<GetUserOperationOptions, "smartAccount">,
  ) => Promise<UserOperation>;
};
