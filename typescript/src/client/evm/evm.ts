import { Address } from "viem";

import {
  CreateServerAccountOptions,
  GetServerAccountOptions,
  ListServerAccountsOptions,
  CreateSmartAccountOptions,
  WaitForUserOperationOptions,
  SignHashOptions,
  SignatureResult,
  SignMessageOptions,
  SignTransactionOptions,
  GetSmartAccountOptions,
  SmartAccount,
  ServerAccount,
  EvmClientInterface,
  ListServerAccountResult,
  PrepareUserOperationOptions,
  UserOperation,
  GetUserOperationOptions,
  ListSmartAccountResult,
  ListSmartAccountsOptions,
  GetOrCreateServerAccountOptions,
  SignTypedDataOptions,
  UpdateEvmAccountOptions,
} from "./evm.types.js";
import { toEvmServerAccount } from "../../accounts/evm/toEvmServerAccount.js";
import { toEvmSmartAccount } from "../../accounts/evm/toEvmSmartAccount.js";
import { getUserOperation } from "../../actions/evm/getUserOperation.js";
import {
  listTokenBalances,
  ListTokenBalancesResult,
  ListTokenBalancesOptions,
} from "../../actions/evm/listTokenBalances.js";
import {
  RequestFaucetOptions,
  RequestFaucetResult,
  requestFaucet,
} from "../../actions/evm/requestFaucet.js";
import { sendTransaction } from "../../actions/evm/sendTransaction.js";
import {
  sendUserOperation,
  SendUserOperationOptions,
  SendUserOperationReturnType,
} from "../../actions/evm/sendUserOperation.js";
import {
  waitForUserOperation,
  WaitForUserOperationReturnType,
} from "../../actions/evm/waitForUserOperation.js";
import { Analytics } from "../../analytics.js";
import { APIError } from "../../openapi-client/errors.js";
import { CdpOpenApiClient } from "../../openapi-client/index.js";
import { Hex } from "../../types/misc.js";

import type {
  TransactionResult,
  SendTransactionOptions,
} from "../../actions/evm/sendTransaction.js";

/**
 * The namespace containing all EVM methods.
 */
export class EvmClient implements EvmClientInterface {
  /**
   * Creates a new CDP EVM account.
   *
   * @param {CreateServerAccountOptions} [options] - Optional parameters for creating the account.
   * @param {string} [options.name] - A name for the account to create.
   * @param {string} [options.idempotencyKey] - An idempotency key.
   *
   * @returns A promise that resolves to the newly created account.
   *
   * @example **Without arguments**
   *          ```ts
   *          const account = await cdp.evm.createAccount();
   *          ```
   *
   * @example **With a name**
   *          ```ts
   *          const account = await cdp.evm.createAccount({ name: "MyAccount" });
   *          ```
   *
   * @example **With an idempotency key**
   *          ```ts
   *          const idempotencyKey = uuidv4();
   *
   *          // First call
   *          await cdp.evm.createAccount({
   *            idempotencyKey,
   *          });
   *
   *          // Second call with the same idempotency key will return the same account
   *          await cdp.evm.createAccount({
   *            idempotencyKey,
   *          });
   *          ```
   */
  async createAccount(options: CreateServerAccountOptions = {}): Promise<ServerAccount> {
    const openApiAccount = await CdpOpenApiClient.createEvmAccount(
      {
        name: options.name,
      },
      options.idempotencyKey,
    );

    const account = toEvmServerAccount(CdpOpenApiClient, {
      account: openApiAccount,
    });

    Analytics.wrapObjectMethodsWithErrorTracking(account);

    return account;
  }

  /**
   * Creates a new CDP EVM smart account.
   *
   * @param {CreateSmartAccountOptions} options - Parameters for creating the smart account.
   * @param {Account} options.owner - The owner of the smart account.
   * The owner can be any Ethereum account with signing capabilities,
   * such as a CDP EVM account or a Viem LocalAccount.
   * @param {string} [options.idempotencyKey] - An idempotency key.
   *
   * @returns A promise that resolves to the newly created smart account.
   *
   * @example **With a CDP EVM Account as the owner**
   *          ```ts
   *          const account = await cdp.evm.createAccount();
   *          const smartAccount = await cdp.evm.createSmartAccount({
   *            owner: account,
   *          });
   *          ```
   *
   * @example **With a Viem LocalAccount as the owner**
   *          ```ts
   *          // See https://viem.sh/docs/accounts/local/privateKeyToAccount
   *          const privateKey = generatePrivateKey();
   *          const account = privateKeyToAccount(privateKey);
   *          const smartAccount = await client.evm.createSmartAccount({
   *            owner: account,
   *          });
   *          ```
   *
   * @example **With an idempotency key**
   *          ```ts
   *          const idempotencyKey = uuidv4();
   *
   *          // First call
   *          await cdp.evm.createSmartAccount({
   *            owner: account,
   *            idempotencyKey,
   *          });
   *
   *          // Second call with the same idempotency key will return the same smart account
   *          await cdp.evm.createSmartAccount({
   *            owner: account,
   *            idempotencyKey,
   *          ```
   */
  async createSmartAccount(options: CreateSmartAccountOptions): Promise<SmartAccount> {
    const openApiSmartAccount = await CdpOpenApiClient.createEvmSmartAccount(
      {
        owners: [options.owner.address],
      },
      options.idempotencyKey,
    );

    const smartAccount = toEvmSmartAccount(CdpOpenApiClient, {
      smartAccount: openApiSmartAccount,
      owner: options.owner,
    });

    Analytics.wrapObjectMethodsWithErrorTracking(smartAccount);

    return smartAccount;
  }

  /**
   * Gets a CDP EVM account.
   *
   * @param {GetServerAccountOptions} options - Parameters for getting the account.
   * Either `address` or `name` must be provided.
   * If both are provided, lookup will be done by `address` and `name` will be ignored.
   * @param {string} [options.address] - The address of the account to get.
   * @param {string} [options.name] - The name of the account to get.
   *
   * @returns A promise that resolves to the account.
   *
   * @example **Get an account by address**
   *          ```ts
   *          const account = await cdp.evm.getAccount({
   *            address: "0x1234567890123456789012345678901234567890",
   *          });
   *          ```
   *
   * @example **Get an account by name**
   *          ```ts
   *          const account = await cdp.evm.getAccount({
   *            name: "MyAccount",
   *          });
   *          ```
   */
  async getAccount(options: GetServerAccountOptions): Promise<ServerAccount> {
    const openApiAccount = await (() => {
      if (options.address) {
        return CdpOpenApiClient.getEvmAccount(options.address);
      }

      if (options.name) {
        return CdpOpenApiClient.getEvmAccountByName(options.name);
      }

      throw new Error("Either address or name must be provided");
    })();

    const account = toEvmServerAccount(CdpOpenApiClient, {
      account: openApiAccount,
    });

    Analytics.wrapObjectMethodsWithErrorTracking(account);

    return account;
  }

  /**
   * Gets a CDP EVM smart account.
   *
   * @param {GetSmartAccountOptions} options - Parameters for getting the smart account.
   * @param {string} options.address - The address of the smart account to get.
   * @param {Account} options.owner - The owner of the smart account.
   * You must pass the signing-capable owner of the smart account so that the returned smart account
   * can be functional.
   *
   * @returns A promise that resolves to the smart account.
   *
   * @example
   * ```ts
   * const smartAccount = await cdp.evm.getSmartAccount({
   *   address: "0x1234567890123456789012345678901234567890",
   *   owner: account,
   * });
   * ```
   */
  async getSmartAccount(options: GetSmartAccountOptions): Promise<SmartAccount> {
    const openApiSmartAccount = await CdpOpenApiClient.getEvmSmartAccount(options.address);

    const smartAccount = toEvmSmartAccount(CdpOpenApiClient, {
      smartAccount: openApiSmartAccount,
      owner: options.owner,
    });

    Analytics.wrapObjectMethodsWithErrorTracking(smartAccount);

    return smartAccount;
  }

  /**
   * Gets a CDP EVM account, or creates one if it doesn't exist.
   *
   * @param {GetOrCreateServerAccountOptions} options - Parameters for getting or creating the account.
   * @param {string} [options.name] - The name of the account to get or create.
   *
   * @returns A promise that resolves to the account.
   *
   * @example
   * ```ts
   * const account = await cdp.evm.getOrCreateAccount({
   *   name: "MyAccount",
   * });
   * ```
   */
  async getOrCreateAccount(options: GetOrCreateServerAccountOptions): Promise<ServerAccount> {
    try {
      const account = await this.getAccount(options);
      return account;
    } catch (error) {
      // If it failed because the account doesn't exist, create it
      const doesAccountNotExist = error instanceof APIError && error.statusCode === 404;
      if (doesAccountNotExist) {
        try {
          const account = await this.createAccount(options);
          return account;
        } catch (error) {
          // If it failed because the account already exists, throw an error
          const doesAccountAlreadyExist = error instanceof APIError && error.statusCode === 409;
          if (doesAccountAlreadyExist) {
            const account = await this.getAccount(options);
            return account;
          }
          throw error;
        }
      }

      throw error;
    }
  }

  /**
   * Gets a user operation for a smart account by user operation hash.
   *
   * @param {GetUserOperationOptions} options - Parameters for getting the user operation.
   * @param {SmartAccount} options.smartAccount - The smart account signing the user operation.
   * @param {string} options.userOpHash - The user operation hash.
   *
   * @returns A promise that resolves to the user operation.
   *
   * @example
   * ```ts
   * const userOp = await cdp.evm.getUserOperation({
   *   smartAccount,
   *   userOpHash: "0x1234567890123456789012345678901234567890123456789012345678901234",
   * });
   * ```
   */
  async getUserOperation(options: GetUserOperationOptions): Promise<UserOperation> {
    return getUserOperation(CdpOpenApiClient, options);
  }

  /**
   * Lists CDP EVM accounts.
   *
   * @param {ListServerAccountsOptions} [options] - Optional parameters for listing the accounts.
   * @param {number} [options.pageSize] - The number of accounts to return.
   * @param {string} [options.pageToken] - The page token to begin listing from.
   * This is obtained by previous calls to this method.
   *
   * @returns A promise that resolves to an array of accounts, and a token to paginate through the accounts.
   *
   * @example
   * ```ts
   * const accounts = await cdp.evm.listAccounts();
   * ```
   *
   * @example **With pagination**
   *          ```ts
   *          let page = await cdp.evm.listAccounts();
   *
   *          while (page.nextPageToken) {
   *            page = await cdp.evm.listAccounts({ pageToken: page.nextPageToken });
   *          }
   *          ```
   */
  async listAccounts(options: ListServerAccountsOptions = {}): Promise<ListServerAccountResult> {
    const ethAccounts = await CdpOpenApiClient.listEvmAccounts({
      pageSize: options.pageSize,
      pageToken: options.pageToken,
    });

    return {
      accounts: ethAccounts.accounts.map(account => {
        const evmAccount = toEvmServerAccount(CdpOpenApiClient, {
          account,
        });

        Analytics.wrapObjectMethodsWithErrorTracking(evmAccount);

        return evmAccount;
      }),
      nextPageToken: ethAccounts.nextPageToken,
    };
  }

  /**
   * Lists CDP EVM token balances.
   *
   * @param {ListTokenBalancesOptions} options - Parameters for listing the token balances.
   * @param {number} [options.pageSize] - The number of token balances to return.
   * @param {string} [options.pageToken] - The page token to begin listing from.
   * This is obtained by previous calls to this method.
   *
   * @returns A promise that resolves to an array of token balances, and a token to paginate through the token balances.
   *
   * @example
   * ```ts
   * const tokenBalances = await cdp.evm.listTokenBalances({
   *   address: "0x1234567890123456789012345678901234567890",
   *   network: "base-sepolia",
   * });
   * ```
   *
   * @example
   * **With pagination**
   * ```ts
   * let page = await cdp.evm.listTokenBalances({
   *   address: "0x1234567890123456789012345678901234567890",
   *   network: "base-sepolia",
   * });
   *
   * while (page.nextPageToken) {
   *   page = await cdp.evm.listTokenBalances({
   *     address: "0x1234567890123456789012345678901234567890",
   *     network: "base-sepolia",
   *     pageToken: page.nextPageToken,
   *   });
   * }
   */
  async listTokenBalances(options: ListTokenBalancesOptions): Promise<ListTokenBalancesResult> {
    return listTokenBalances(CdpOpenApiClient, options);
  }

  /**
   * Lists CDP EVM smart accounts.
   *
   * @param {ListSmartAccountsOptions} options - Parameters for listing the smart accounts.
   * @param {number} [options.pageSize] - The number of smart accounts to return.
   * @param {string} [options.pageToken] - The page token to begin listing from.
   * This is obtained by previous calls to this method.
   *
   * @returns A promise that resolves to an array of smart accounts, and a token to paginate through the smart accounts.
   *
   * @example
   * ```ts
   * const smartAccounts = await cdp.evm.listSmartAccounts();
   * ```
   *
   * @example **With pagination**
   *          ```ts
   *          let page = await cdp.evm.listSmartAccounts();
   *
   *          while (page.nextPageToken) {
   *            page = await cdp.evm.listSmartAccounts({ pageToken: page.nextPageToken });
   *          }
   */
  async listSmartAccounts(options: ListSmartAccountsOptions = {}): Promise<ListSmartAccountResult> {
    const smartAccounts = await CdpOpenApiClient.listEvmSmartAccounts({
      pageSize: options.pageSize,
      pageToken: options.pageToken,
    });

    return {
      accounts: smartAccounts.accounts.map(account => ({
        address: account.address as Address,
        owners: [account.owners[0] as Address],
        type: "evm-smart",
      })),
      nextPageToken: smartAccounts.nextPageToken,
    };
  }

  /**
   * Prepares a user operation for a smart account.
   *
   * @param {PrepareUserOperationOptions} options - Parameters for preparing the user operation.
   * @param {SmartAccount} options.smartAccount - The smart account signing the user operation.
   * @param {string} options.network - The network to prepare the user operation for.
   * @param {EvmCall[]} options.calls - The calls to include in the user operation.
   * @param {string} [options.paymasterUrl] - The optional paymaster URL to use for the user operation.
   *
   * @returns A promise that resolves to the user operation hash.
   *
   * @example
   * ```ts
   * const userOp = await cdp.evm.prepareUserOperation({
   *   smartAccount,
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
  async prepareUserOperation(options: PrepareUserOperationOptions): Promise<UserOperation> {
    const userOp = await CdpOpenApiClient.prepareUserOperation(options.smartAccount.address, {
      network: options.network,
      calls: options.calls.map(call => ({
        to: call.to as Address,
        value: call.value.toString(),
        data: call.data as Hex,
      })),
      paymasterUrl: options.paymasterUrl,
    });

    return {
      network: userOp.network,
      userOpHash: userOp.userOpHash as Hex,
      status: userOp.status,
      calls: userOp.calls.map(call => ({
        to: call.to as Address,
        value: BigInt(call.value),
        data: call.data as Hex,
      })),
    };
  }

  /**
   * Requests funds from an EVM faucet.
   *
   * @param {RequestFaucetOptions} options - Parameters for requesting funds from the EVM faucet.
   * @param {string} options.address - The address to request funds for.
   * @param {string} options.network - The network to request funds from.
   * @param {string} options.token - The token to request funds for.
   * @param {string} [options.idempotencyKey] - An idempotency key.
   *
   * @returns A promise that resolves to the transaction hash.
   *
   * @example
   * ```ts
   * const result = await cdp.evm.requestFaucet({
   *   address: "0x1234567890123456789012345678901234567890",
   *   network: "base-sepolia",
   *   token: "eth",
   * });
   * ```
   */
  async requestFaucet(options: RequestFaucetOptions): Promise<RequestFaucetResult> {
    return requestFaucet(CdpOpenApiClient, options);
  }

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
   * const { transactionHash } = await cdp.evm.sendTransaction({
   *   address: account.address,
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
   * const { transactionHash } = await cdp.evm.sendTransaction({
   *   address: account.address,
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
  async sendTransaction(options: SendTransactionOptions): Promise<TransactionResult> {
    return sendTransaction(CdpOpenApiClient, options);
  }

  /**
   * Sends a user operation.
   *
   * @param {SendUserOperationOptions} options - Parameters for sending the user operation.
   * @param {SmartAccount} options.smartAccount - The smart account sending the user operation.
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
   * const userOp = await cdp.evm.sendUserOperation({
   *   smartAccount,
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
  async sendUserOperation(
    options: SendUserOperationOptions<unknown[]>,
  ): Promise<SendUserOperationReturnType> {
    return sendUserOperation(CdpOpenApiClient, {
      smartAccount: options.smartAccount,
      network: options.network,
      calls: options.calls,
      paymasterUrl: options.paymasterUrl,
      idempotencyKey: options.idempotencyKey,
    });
  }

  /**
   * Signs an EVM hash.
   *
   * @param {SignHashOptions} options - Parameters for signing the hash.
   * @param {string} options.address - The address to sign the hash for.
   * @param {string} options.hash - The hash to sign.
   * @param {string} [options.idempotencyKey] - An idempotency key.
   *
   * @returns A promise that resolves to the signature.
   *
   * @example
   * ```ts
   * // Create a new EVM server account to sign with
   * const ethAccount = await cdp.createEvmServerAccount({});
   *
   * const signature = await cdp.evm.signHash({
   *   address: ethAccount.address,
   *   hash: "0x1234567890123456789012345678901234567890123456789012345678901234",
   * });
   * ```
   */
  async signHash(options: SignHashOptions): Promise<SignatureResult> {
    const signature = await CdpOpenApiClient.signEvmHash(
      options.address,
      {
        hash: options.hash,
      },
      options.idempotencyKey,
    );

    return {
      signature: signature.signature as Hex,
    };
  }

  /**
   * Signs an EVM message.
   *
   * @param {SignMessageOptions} options - Parameters for signing the message.
   * @param {string} options.address - The address to sign the message for.
   * @param {string} options.message - The message to sign.
   * @param {string} [options.idempotencyKey] - An idempotency key.
   *
   * @returns A promise that resolves to the signature.
   *
   * @example
   * ```ts
   * // Create a new EVM server account to sign with
   * const ethAccount = await cdp.createEvmServerAccount({});
   *
   * const signature = await cdp.evm.signMessage({
   *   address: ethAccount.address,
   *   message: "Hello, world!",
   * });
   * ```
   */
  async signMessage(options: SignMessageOptions): Promise<SignatureResult> {
    const signature = await CdpOpenApiClient.signEvmMessage(
      options.address,
      {
        message: options.message,
      },
      options.idempotencyKey,
    );

    return {
      signature: signature.signature as Hex,
    };
  }

  /**
   * Signs an EIP-712 message.
   *
   * @param {SignTypedDataOptions} options - Parameters for signing the EIP-712 message.
   * @returns A promise that resolves to the signature.
   *
   * @example
   * ```ts
   * const signature = await cdp.evm.signTypedData({
   *   address: account.address,
   *   domain: {
   *     name: "Permit2",
   *     chainId: 1,
   *     verifyingContract: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
   *   },
   *   types: {
   *     EIP712Domain: [
   *       { name: "name", type: "string" },
   *       { name: "chainId", type: "uint256" },
   *       { name: "verifyingContract", type: "address" },
   *     ],
   *     PermitTransferFrom: [
   *       { name: "permitted", type: "TokenPermissions" },
   *       { name: "spender", type: "address" },
   *       { name: "nonce", type: "uint256" },
   *       { name: "deadline", type: "uint256" },
   *     ],
   *     TokenPermissions: [
   *       { name: "token", type: "address" },
   *       { name: "amount", type: "uint256" },
   *     ],
   *   },
   *   primaryType: "PermitTransferFrom",
   *   message: {
   *     permitted: {
   *       token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
   *       amount: "1000000",
   *     },
   *     spender: "0xFfFfFfFFfFFfFFfFFfFFFFFffFFFffffFfFFFfFf",
   *     nonce: "0",
   *     deadline: "1717123200",
   *   },
   * });
   * ```
   */
  async signTypedData(options: SignTypedDataOptions): Promise<SignatureResult> {
    const signature = await CdpOpenApiClient.signEvmTypedData(
      options.address,
      {
        domain: options.domain,
        types: options.types,
        primaryType: options.primaryType,
        message: options.message,
      },
      options.idempotencyKey,
    );

    return {
      signature: signature.signature as Hex,
    };
  }

  /**
   * Signs an EVM transaction.
   *
   * @param {SignTransactionOptions} options - Configuration options for signing the transaction.
   * @returns A promise that resolves to the signature.
   *
   * @example
   * ```ts
   * import { parseEther, serializeTransaction } from "viem";
   * import { baseSepolia } from "viem/chains";
   *
   * // Create a new EVM server account to sign with
   * const ethAccount = await cdp.createEvmServerAccount({});
   *
   * const serializedTx = serializeTransaction(
   *   {
   *     chainId: baseSepolia.id,
   *     data: "0x",
   *     to: "0x4252e0c9A3da5A2700e7d91cb50aEf522D0C6Fe8",
   *     type: "eip1559",
   *     value: parseEther("0.000001"),
   *   },
   * );
   *
   * const signature = await cdp.evm.signTransaction({
   *   address: ethAccount.address,
   *   transaction: serializedTx,
   * });
   * ```
   */
  async signTransaction(options: SignTransactionOptions): Promise<SignatureResult> {
    const signature = await CdpOpenApiClient.signEvmTransaction(
      options.address,
      {
        transaction: options.transaction,
      },
      options.idempotencyKey,
    );

    return {
      signature: signature.signedTransaction as Hex,
    };
  }

  /**
   * Updates a CDP EVM account.
   *
   * @param {UpdateEvmAccountOptions} [options] - Optional parameters for creating the account.
   * @param {string} options.address - The address of the account to update
   * @param {UpdateEvmAccountBody} options.update - An object containing account fields to update.
   * @param {string} [options.update.name] - The new name for the account.
   * @param {string} [options.update.accountPolicy] - The ID of a Policy to apply to the account.
   * @param {string} [options.idempotencyKey] - An idempotency key.
   *
   * @returns A promise that resolves to the updated account.
   *
   * @example **With a name**
   *          ```ts
   *          const account = await cdp.evm.updateAccount({ address: "0x...", update: { name: "New Name" } });
   *          ```
   *
   * @example **With an account policy**
   *          ```ts
   *          const account = await cdp.evm.updateAccount({ address: "0x...", update: { accountPolicy: "73bcaeeb-d7af-4615-b064-42b5fe83a31e" } });
   *          ```
   *
   * @example **With an idempotency key**
   *          ```ts
   *          const idempotencyKey = uuidv4();
   *
   *          // First call
   *          await cdp.evm.updateAccount({
   *            address: "0x...",
   *            update: { accountPolicy: "73bcaeeb-d7af-4615-b064-42b5fe83a31e" },
   *            idempotencyKey,
   *          });
   *
   *          // Second call with the same idempotency key will not update
   *          await cdp.evm.updateAccount({
   *            address: '0x...',
   *            update: { name: "" },
   *            idempotencyKey,
   *          });
   *          ```
   */
  async updateAccount(options: UpdateEvmAccountOptions): Promise<ServerAccount> {
    const openApiAccount = await CdpOpenApiClient.updateEvmAccount(
      options.address,
      options.update,
      options.idempotencyKey,
    );

    const account = toEvmServerAccount(CdpOpenApiClient, {
      account: openApiAccount,
    });

    Analytics.wrapObjectMethodsWithErrorTracking(account);

    return account;
  }

  /**
   * Waits for a user operation to complete or fail.
   *
   * @param {WaitForUserOperationOptions} options - Parameters for waiting for the user operation.
   * @param {string} options.smartAccountAddress - The address of the smart account.
   * @param {string} options.userOpHash - The user operation hash.
   * @param {WaitOptions} [options.waitOptions] - Optional parameters for the wait operation.
   *
   * @returns A promise that resolves to the transaction receipt.
   *
   * @example
   * ```ts
   * // Send a user operation and get the user operation hash
   * const { userOpHash } = await cdp.evm.sendUserOperation({
   *   smartAccount,
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
   * const result = await cdp.evm.waitForUserOperation({
   *   smartAccountAddress: smartAccount.address,
   *   userOpHash: userOp.userOpHash,
   * });
   * ```
   */
  async waitForUserOperation(
    options: WaitForUserOperationOptions,
  ): Promise<WaitForUserOperationReturnType> {
    return waitForUserOperation(CdpOpenApiClient, {
      ...options,
    });
  }
}
