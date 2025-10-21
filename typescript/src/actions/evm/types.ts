/**
 * @module Actions
 */

import { SendUserOperationOptions, SendUserOperationReturnType } from "./sendUserOperation.js";
import { UseSpendPermissionOptions } from "./spend-permissions/types.js";
import { KnownEvmNetworks } from "../../accounts/evm/types.js";
import {
  GetUserOperationOptions,
  SignTypedDataOptions,
  UserOperation,
} from "../../client/evm/evm.types.js";
import { Hex } from "../../types/misc.js";

import type { ListTokenBalancesOptions, ListTokenBalancesResult } from "./listTokenBalances.js";
import type { RequestFaucetOptions, RequestFaucetResult } from "./requestFaucet.js";
import type { SendTransactionOptions, TransactionResult } from "./sendTransaction.js";
import type {
  AccountSwapOptions,
  AccountSwapResult,
  AccountQuoteSwapOptions,
  AccountQuoteSwapResult,
  SmartAccountSwapOptions,
  SmartAccountSwapResult,
  SmartAccountQuoteSwapOptions,
  SmartAccountQuoteSwapResult,
} from "./swap/types.js";
import type { SmartAccountTransferOptions, TransferOptions } from "./transfer/types.js";
import type {
  WaitForUserOperationOptions,
  WaitForUserOperationReturnType,
} from "./waitForUserOperation.js";

export type Actions = {
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

  /**
   * Creates a swap quote without executing the transaction.
   * This is useful when you need to get swap details before executing the swap.
   * The taker is automatically set to the account's address.
   *
   * @param {AccountQuoteSwapOptions} options - Configuration options for creating the swap quote.
   * @param {string} options.network - The network to create the quote on
   * @param {string} options.fromToken - The token address to send
   * @param {string} options.toToken - The token address to receive
   * @param {bigint} options.fromAmount - The amount of fromToken to send
   * @param {string} [options.signerAddress] - The signer address (only needed if taker is a smart contract)
   * @param {bigint} [options.gasPrice] - The gas price in Wei
   * @param {number} [options.slippageBps] - The slippage tolerance in basis points (0-10000)
   *
   * @returns A promise that resolves to the swap quote or a response indicating that liquidity is unavailable.
   *
   * @example
   * ```ts
   * const swapQuote = await account.quoteSwap({
   *   network: "base",
   *   fromToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
   *   toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
   *   fromAmount: BigInt("1000000000000000000"), // 1 WETH in wei
   * });
   *
   * if (swapQuote.liquidityAvailable) {
   *   console.log(`Can swap for ${swapQuote.toAmount} USDC`);
   * }
   * ```
   */
  quoteSwap: (options: AccountQuoteSwapOptions) => Promise<AccountQuoteSwapResult>;

  /**
   * Executes a token swap on the specified network.
   * This method handles all the steps required for a swap, including Permit2 signatures if needed.
   * The taker is automatically set to the account's address.
   *
   * @param {AccountSwapOptions} options - Configuration options for the swap.
   * @param {string} [options.network] - The network to execute the swap on (required for inline swaps)
   * @param {CreateSwapQuoteResult} [options.swapQuote] - The swap quote returned by the createSwapQuote method
   * @param {string} [options.fromToken] - The token address to send (required for inline swaps)
   * @param {string} [options.toToken] - The token address to receive (required for inline swaps)
   * @param {bigint} [options.fromAmount] - The amount of fromToken to send (required for inline swaps)
   * @param {string} [options.idempotencyKey] - Optional idempotency key for the request
   *
   * @returns A promise that resolves to the transaction hash.
   *
   * @throws {Error} If liquidity is not available when using inline options.
   *
   * @example **Using a pre-created swap quote**
   * ```ts
   * // First create a swap quote
   * const swapQuote = await cdp.evm.createSwapQuote({
   *   network: "base",
   *   toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
   *   fromToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
   *   fromAmount: BigInt("1000000000000000000"), // 1 WETH in wei
   *   taker: account.address
   * });
   *
   * // Check if liquidity is available
   * if (!swapQuote.liquidityAvailable) {
   *   console.error("Insufficient liquidity for swap");
   *   return;
   * }
   *
   * // Execute the swap
   * const { transactionHash } = await account.swap({
   *   swapQuote: swapQuote
   * });
   *
   * console.log(`Swap executed with transaction hash: ${transactionHash}`);
   * ```
   *
   * @example **Using inline options (all-in-one)**
   * ```ts
   * // Create and execute swap in one call
   * const { transactionHash } = await account.swap({
   *   network: "base",
   *   toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
   *   fromToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
   *   fromAmount: BigInt("1000000000000000000"), // 1 WETH in wei
   * });
   *
   * console.log(`Swap executed with transaction hash: ${transactionHash}`);
   * ```
   */
  swap: (options: AccountSwapOptions) => Promise<AccountSwapResult>;

  /**
   * Uses a spend permission to execute a transaction.
   * This allows the account to spend tokens that have been approved via a spend permission.
   *
   * @param {UseSpendPermissionOptions} options - Configuration options for using the spend permission.
   * @param {SpendPermission} options.spendPermission - The spend permission object containing authorization details.
   * @param {bigint} options.value - The amount to spend (must not exceed the permission's allowance).
   * @param {KnownEvmNetworks} options.network - The network to execute the transaction on.
   *
   * @returns A promise that resolves to the transaction result.
   *
   * @throws {Error} If the network doesn't support spend permissions via CDP API.
   *
   * @example
   * ```typescript
   * const spendPermission = {
   *   account: "0x1234...", // Smart account that owns the tokens
   *   spender: account.address, // This account that can spend
   *   token: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // ETH
   *   allowance: parseEther("0.01"),
   *   period: 86400, // 1 day
   *   start: 0,
   *   end: 281474976710655,
   *   salt: 0n,
   *   extraData: "0x",
   * };
   *
   * const result = await account.useSpendPermission({
   *   spendPermission,
   *   value: parseEther("0.001"), // Spend 0.001 ETH
   *   network: "base-sepolia",
   * });
   * ```
   */
  useSpendPermission: (options: UseSpendPermissionOptions) => Promise<TransactionResult>;
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
  transfer: (options: SmartAccountTransferOptions) => Promise<SendUserOperationReturnType>;

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

  /**
   * Creates a swap quote without executing the transaction.
   * This is useful when you need to get swap details before executing the swap.
   * The taker is automatically set to the smart account's address.
   *
   * @param {SmartAccountQuoteSwapOptions} options - Configuration options for creating the swap quote.
   * @param {string} options.network - The network to create the quote on
   * @param {string} options.fromToken - The token address to send
   * @param {string} options.toToken - The token address to receive
   * @param {bigint} options.fromAmount - The amount of fromToken to send
   * @param {string} [options.signerAddress] - The signer address (only needed if taker is a smart contract)
   * @param {bigint} [options.gasPrice] - The gas price in Wei
   * @param {number} [options.slippageBps] - The slippage tolerance in basis points (0-10000)
   *
   * @returns A promise that resolves to the swap quote or a response indicating that liquidity is unavailable.
   *
   * @example
   * ```ts
   * const swapQuote = await smartAccount.quoteSwap({
   *   network: "base",
   *   fromToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
   *   toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
   *   fromAmount: BigInt("1000000000000000000"), // 1 WETH in wei
   * });
   *
   * if (swapQuote.liquidityAvailable) {
   *   console.log(`Can swap for ${swapQuote.toAmount} USDC`);
   * }
   * ```
   */
  quoteSwap: (options: SmartAccountQuoteSwapOptions) => Promise<SmartAccountQuoteSwapResult>;

  /**
   * Executes a token swap on the specified network via a user operation.
   * This method handles all the steps required for a swap, including Permit2 signatures if needed.
   * The taker is automatically set to the smart account's address.
   *
   * @param {SmartAccountSwapOptions} options - Configuration options for the swap.
   * @param {string} [options.network] - The network to execute the swap on (required for inline swaps)
   * @param {CreateSwapQuoteResult} [options.swapQuote] - The swap quote returned by the createSwapQuote method
   * @param {string} [options.fromToken] - The token address to send (required for inline swaps)
   * @param {string} [options.toToken] - The token address to receive (required for inline swaps)
   * @param {bigint} [options.fromAmount] - The amount of fromToken to send (required for inline swaps)
   * @param {string} [options.paymasterUrl] - Optional paymaster URL for gas sponsorship
   * @param {string} [options.idempotencyKey] - Optional idempotency key for the request
   *
   * @returns A promise that resolves to the user operation result.
   *
   * @throws {Error} If liquidity is not available when using inline options.
   *
   * @example **Using a pre-created swap quote**
   * ```ts
   * // First create a swap quote
   * const swapQuote = await cdp.evm.createSwapQuote({
   *   network: "base",
   *   toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
   *   fromToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
   *   fromAmount: BigInt("1000000000000000000"), // 1 WETH in wei
   *   taker: smartAccount.address,
   *   signerAddress: smartAccount.owners[0].address
   * });
   *
   * // Check if liquidity is available
   * if (!swapQuote.liquidityAvailable) {
   *   console.error("Insufficient liquidity for swap");
   *   return;
   * }
   *
   * // Execute the swap
   * const { userOpHash } = await smartAccount.swap({
   *   swapQuote: swapQuote
   * });
   *
   * console.log(`Swap executed with user op hash: ${userOpHash}`);
   * ```
   *
   * @example **Using inline options (all-in-one)**
   * ```ts
   * // Create and execute swap in one call
   * const { userOpHash } = await smartAccount.swap({
   *   network: "base",
   *   toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
   *   fromToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
   *   fromAmount: BigInt("1000000000000000000"), // 1 WETH in wei
   * });
   *
   * console.log(`Swap executed with user op hash: ${userOpHash}`);
   * ```
   */
  swap: (options: SmartAccountSwapOptions) => Promise<SmartAccountSwapResult>;

  /**
   * Signs a typed data message.
   *
   * @param {SignTypedDataOptions} options - Configuration options for signing the typed data.
   * @param {string} options.network - The network to sign the typed data on
   * @param {string} options.typedData - The typed data to sign
   *
   * @returns A promise that resolves to the signature.
   *
   * @example
   * ```ts
   * const signature = await smartAccount.signTypedData({
   *   network: "base-sepolia",
   *   typedData: {
   *     domain: {
   *       name: "Test",
   *       chainId: 84532,
   *       verifyingContract: "0x0000000000000000000000000000000000000000",
   *     },
   *     types: {
   *       Test: [{ name: "name", type: "string" }],
   *     },
   *     primaryType: "Test",
   *     message: {
   *       name: "John Doe",
   *     },
   *   },
   * });
   * ```
   */
  signTypedData: (
    options: Omit<SignTypedDataOptions, "address"> & { network: KnownEvmNetworks },
  ) => Promise<Hex>;

  /**
   * Uses a spend permission to execute a transaction via user operation.
   * This allows the smart account to spend tokens that have been approved via a spend permission.
   *
   * @param {UseSpendPermissionOptions} options - Configuration options for using the spend permission.
   * @param {SpendPermission} options.spendPermission - The spend permission object containing authorization details.
   * @param {bigint} options.value - The amount to spend (must not exceed the permission's allowance).
   * @param {KnownEvmNetworks} options.network - The network to execute the transaction on.
   *
   * @returns A promise that resolves to the user operation result.
   *
   * @throws {Error} If the network doesn't support spend permissions via CDP API.
   *
   * @example
   * ```typescript
   * const spendPermission = {
   *   account: "0x1234...", // Smart account that owns the tokens
   *   spender: smartAccount.address, // This smart account that can spend
   *   token: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // ETH
   *   allowance: parseEther("0.01"),
   *   period: 86400, // 1 day
   *   start: 0,
   *   end: 281474976710655,
   *   salt: 0n,
   *   extraData: "0x",
   * };
   *
   * const result = await smartAccount.useSpendPermission({
   *   spendPermission,
   *   value: parseEther("0.001"), // Spend 0.001 ETH
   *   network: "base-sepolia",
   * });
   * ```
   */
  useSpendPermission: (options: UseSpendPermissionOptions) => Promise<SendUserOperationReturnType>;
};
