/**
 * @module Client
 */

import { constants, publicEncrypt } from "crypto";

import { type Address, getTypesForEIP712Domain } from "viem";

import {
  CreateServerAccountOptions,
  CreateSmartAccountOptions,
  CreateSwapQuoteOptions,
  CreateSwapQuoteResult,
  EvmClientInterface,
  ExportServerAccountOptions,
  GetOrCreateServerAccountOptions,
  GetOrCreateSmartAccountOptions,
  GetServerAccountOptions,
  GetSmartAccountOptions,
  GetSwapPriceOptions,
  GetSwapPriceResult,
  GetUserOperationOptions,
  ImportServerAccountOptions,
  ListServerAccountResult,
  ListServerAccountsOptions,
  ListSmartAccountResult,
  ListSmartAccountsOptions,
  PrepareAndSendUserOperationOptions,
  PrepareUserOperationOptions,
  ServerAccount,
  SignatureResult,
  SignHashOptions,
  SignMessageOptions,
  SignTransactionOptions,
  SignTypedDataOptions,
  SmartAccount,
  SwapUnavailableResult,
  UpdateEvmAccountOptions,
  UpdateEvmSmartAccountOptions,
  UserOperation,
  WaitForUserOperationOptions,
} from "./evm.types.js";
import { toEvmServerAccount } from "../../accounts/evm/toEvmServerAccount.js";
import { toEvmSmartAccount } from "../../accounts/evm/toEvmSmartAccount.js";
import { getUserOperation } from "../../actions/evm/getUserOperation.js";
import {
  listSpendPermissions,
  ListSpendPermissionsResult,
} from "../../actions/evm/listSpendPermissions.js";
import {
  listTokenBalances,
  ListTokenBalancesOptions,
  ListTokenBalancesResult,
} from "../../actions/evm/listTokenBalances.js";
import {
  requestFaucet,
  RequestFaucetOptions,
  RequestFaucetResult,
} from "../../actions/evm/requestFaucet.js";
import { sendTransaction } from "../../actions/evm/sendTransaction.js";
import {
  PrepareAndSendUserOperationReturnType,
  sendUserOperation,
  SendUserOperationOptions,
  SendUserOperationReturnType,
} from "../../actions/evm/sendUserOperation.js";
import { resolveSpendPermission } from "../../actions/evm/spend-permissions/resolveSpendPermission.js";
import { createSwapQuote } from "../../actions/evm/swap/createSwapQuote.js";
import { getSwapPrice } from "../../actions/evm/swap/getSwapPrice.js";
import {
  waitForUserOperation,
  WaitForUserOperationReturnType,
} from "../../actions/evm/waitForUserOperation.js";
import { Analytics } from "../../analytics.js";
import { ImportAccountPublicRSAKey } from "../../constants.js";
import { UserInputValidationError } from "../../errors.js";
import { APIError } from "../../openapi-client/errors.js";
import {
  CdpOpenApiClient,
  EvmUserOperationStatus,
  EIP712Message as OpenAPIEIP712Message,
} from "../../openapi-client/index.js";
import { SPEND_PERMISSION_MANAGER_ADDRESS } from "../../spend-permissions/constants.js";
import { Hex } from "../../types/misc.js";
import { decryptWithPrivateKey, generateExportEncryptionKeyPair } from "../../utils/export.js";

import type {
  SendTransactionOptions,
  TransactionResult,
} from "../../actions/evm/sendTransaction.js";
import type {
  CreateSpendPermissionOptions,
  ListSpendPermissionsOptions,
  RevokeSpendPermissionOptions,
} from "../../spend-permissions/types.js";

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
    Analytics.trackAction({
      action: "create_account",
      accountType: "evm_server",
    });

    return this._createAccountInternal(options);
  }

  /**
   * Imports a CDP EVM account from an external source.
   *
   * @param {ImportServerAccountOptions} options - Parameters for importing the account.
   * @param {string} options.privateKey - The private key of the account to import.
   * @param {string} [options.name] - A name for the account to import.
   * @param {string} [options.idempotencyKey] - An idempotency key.
   *
   * @returns A promise that resolves to the imported account.
   *
   * @example **Without arguments**
   *          ```ts
   *          const account = await cdp.evm.importAccount({
   *            privateKey: "0x123456"
   *          });
   *          ```
   *
   * @example **With a name**
   *          ```ts
   *          const account = await cdp.evm.importAccount({
   *            privateKey: "0x123456",
   *            name: "MyAccount"
   *          });
   *          ```
   *
   * @example **With an idempotency key**
   *          ```ts
   *          const idempotencyKey = uuidv4();
   *
   *          // First call
   *          await cdp.evm.importAccount({
   *            privateKey: "0x123456",
   *            idempotencyKey,
   *          });
   *
   *          // Second call with the same idempotency key will return the same account
   *          await cdp.evm.importAccount({
   *            privateKey: "0x123456"
   *            idempotencyKey,
   *          });
   *          ```
   */
  async importAccount(options: ImportServerAccountOptions): Promise<ServerAccount> {
    Analytics.trackAction({
      action: "import_account",
      accountType: "evm_server",
    });

    const encryptionPublicKey = options.encryptionPublicKey || ImportAccountPublicRSAKey;

    const privateKeyHex = options.privateKey.startsWith("0x")
      ? options.privateKey.slice(2)
      : options.privateKey;

    if (!/^[0-9a-fA-F]+$/.test(privateKeyHex)) {
      throw new UserInputValidationError("Private key must be a valid hexadecimal string");
    }

    try {
      const privateKeyBytes = Buffer.from(privateKeyHex, "hex");

      const encryptedPrivateKey = publicEncrypt(
        {
          key: encryptionPublicKey,
          padding: constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: "sha256",
        },
        privateKeyBytes,
      );

      const openApiAccount = await CdpOpenApiClient.importEvmAccount(
        {
          name: options.name,
          encryptedPrivateKey: encryptedPrivateKey.toString("base64"),
        },
        options.idempotencyKey,
      );

      const account = toEvmServerAccount(CdpOpenApiClient, {
        account: openApiAccount,
      });

      Analytics.wrapObjectMethodsWithErrorTracking(account);

      return account;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new Error(`Failed to import account: ${String(error)}`);
    }
  }

  /**
   * Exports a CDP EVM account's private key.
   * It is important to store the private key in a secure place after it's exported.
   *
   * @param {ExportServerAccountOptions} options - Parameters for exporting the account.
   * @param {string} [options.address] - The address of the account to export.
   * @param {string} [options.name] - The name of the account to export.
   * @param {string} [options.idempotencyKey] - An idempotency key.
   *
   * @returns A promise that resolves to the exported account’s 32-byte private key as a hex string, without the "0x" prefix.
   *
   * @example **With an address**
   * ```ts
   * const privateKey = await cdp.evm.exportAccount({
   *   address: "0x1234567890123456789012345678901234567890",
   * });
   * ```
   *
   * @example **With a name**
   * ```ts
   * const privateKey = await cdp.evm.exportAccount({
   *   name: "MyAccount",
   * });
   * ```
   */
  async exportAccount(options: ExportServerAccountOptions): Promise<string> {
    Analytics.trackAction({
      action: "export_account",
      accountType: "evm_server",
    });

    const { publicKey, privateKey } = await generateExportEncryptionKeyPair();

    const { encryptedPrivateKey } = await (async () => {
      if (options.address) {
        return CdpOpenApiClient.exportEvmAccount(
          options.address,
          {
            exportEncryptionKey: publicKey,
          },
          options.idempotencyKey,
        );
      }

      if (options.name) {
        return CdpOpenApiClient.exportEvmAccountByName(
          options.name,
          {
            exportEncryptionKey: publicKey,
          },
          options.idempotencyKey,
        );
      }

      throw new UserInputValidationError("Either address or name must be provided");
    })();

    return decryptWithPrivateKey(privateKey, encryptedPrivateKey);
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
    Analytics.trackAction({
      action: "create_smart_account",
      accountType: "evm_smart",
    });

    return this._createSmartAccountInternal(options);
  }

  /**
   * Creates a spend permission for a smart account.
   *
   * @param {CreateSpendPermissionOptions} options - Parameters for creating the spend permission.
   * @param {SpendPermission} options.spendPermission - The spend permission to create.
   * @param {string} [options.idempotencyKey] - The idempotency key to use for the spend permission.
   *
   * @returns A promise that resolves to the spend permission.
   *
   * @example
   * ```ts
   * const userOperation = await cdp.evm.createSpendPermission({
   *   spendPermission,
   *   network: "base-sepolia",
   * });
   * ```
   */
  async createSpendPermission(options: CreateSpendPermissionOptions): Promise<UserOperation> {
    Analytics.trackAction({
      action: "create_spend_permission",
    });

    const resolvedSpendPermission = resolveSpendPermission(
      options.spendPermission,
      options.network,
    );

    const userOperation = await CdpOpenApiClient.createSpendPermission(
      resolvedSpendPermission.account,
      {
        spender: resolvedSpendPermission.spender,
        token: resolvedSpendPermission.token,
        allowance: resolvedSpendPermission.allowance.toString(),
        period: resolvedSpendPermission.period.toString(),
        start: resolvedSpendPermission.start.toString(),
        end: resolvedSpendPermission.end.toString(),
        salt: resolvedSpendPermission.salt.toString(),
        extraData: resolvedSpendPermission.extraData,
        network: options.network,
        paymasterUrl: options.paymasterUrl,
      },
      options.idempotencyKey,
    );

    return {
      network: userOperation.network,
      userOpHash: userOperation.userOpHash as Hex,
      status: userOperation.status,
      calls: userOperation.calls.map(call => ({
        to: call.to as Address,
        value: BigInt(call.value),
        data: call.data as Hex,
      })),
    };
  }

  /**
   * Revokes a spend permission for a smart account.
   *
   * @param {RevokeSpendPermissionOptions} options - Parameters for revoking the spend permission.
   * @param {string} options.address - The address of the smart account.
   * @param {string} options.permissionHash - The hash of the spend permission to revoke.
   * @param {string} options.network - The network of the spend permission.
   * @param {string} [options.paymasterUrl] - The paymaster URL of the spend permission.
   *
   * @returns A promise that resolves to the user operation.
   *
   * @example
   * ```ts
   * const userOperation = await cdp.evm.revokeSpendPermission({
   *   address: "0x1234567890123456789012345678901234567890",
   *   permissionHash: "0x1234567890123456789012345678901234567890123456789012345678901234",
   *   network: "base-sepolia",
   * });
   * ```
   */
  async revokeSpendPermission(options: RevokeSpendPermissionOptions): Promise<UserOperation> {
    Analytics.trackAction({
      action: "revoke_spend_permission",
    });

    const userOperation = await CdpOpenApiClient.revokeSpendPermission(
      options.address,
      {
        network: options.network,
        permissionHash: options.permissionHash,
        paymasterUrl: options.paymasterUrl,
      },
      options.idempotencyKey,
    );

    return {
      network: userOperation.network,
      userOpHash: userOperation.userOpHash as Hex,
      status: userOperation.status,
      calls: userOperation.calls.map(call => ({
        to: call.to as Address,
        value: BigInt(call.value),
        data: call.data as Hex,
      })),
    };
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
    Analytics.trackAction({
      action: "get_account",
      accountType: "evm_server",
    });

    return this._getAccountInternal(options);
  }

  /**
   * Gets a CDP EVM smart account.
   *
   * @param {GetSmartAccountOptions} options - Parameters for getting the smart account.
   * Either `address` or `name` must be provided.
   * If both are provided, lookup will be done by `address` and `name` will be ignored.
   * @param {string} [options.address] - The address of the smart account to get.
   * @param {string} [options.name] - The name of the smart account to get.
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
    Analytics.trackAction({
      action: "get_smart_account",
    });

    return this._getSmartAccountInternal(options);
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
    Analytics.trackAction({
      action: "get_or_create_account",
      accountType: "evm_server",
    });

    try {
      const account = await this._getAccountInternal(options);
      return account;
    } catch (error) {
      // If it failed because the account doesn't exist, create it
      const doesAccountNotExist = error instanceof APIError && error.statusCode === 404;
      if (doesAccountNotExist) {
        try {
          const account = await this._createAccountInternal(options);
          return account;
        } catch (error) {
          // If it failed because the account already exists, get the existing account
          const doesAccountAlreadyExist = error instanceof APIError && error.statusCode === 409;
          if (doesAccountAlreadyExist) {
            const account = await this._getAccountInternal(options);
            return account;
          }
          throw error;
        }
      }
      throw error;
    }
  }

  /**
   * Gets a CDP EVM smart account, or creates one if it doesn't exist.
   * This method first attempts to retrieve an existing smart account with the given parameters.
   * If no account exists, it creates a new one with the specified owner.
   *
   * @param {GetOrCreateSmartAccountOptions} options - Configuration options for getting or creating the smart account.
   * @param {string} [options.name] - The name of the smart account to get or create.
   * @param {Account} options.owner - The owner of the smart account.
   *
   * @returns {Promise<SmartAccount>} A promise that resolves to the retrieved or newly created smart account.
   *
   * @example
   * ```ts
   * const smartAccount = await cdp.evm.getOrCreateSmartAccount({
   *   name: "MySmartAccount",
   *   owner: account,
   * });
   * ```
   */
  async getOrCreateSmartAccount(options: GetOrCreateSmartAccountOptions): Promise<SmartAccount> {
    Analytics.trackAction({
      action: "get_or_create_smart_account",
      accountType: "evm_smart",
    });

    try {
      const account = await this._getSmartAccountInternal(options);
      return account;
    } catch (error) {
      // If it failed because the account doesn't exist, create it
      const doesAccountNotExist = error instanceof APIError && error.statusCode === 404;
      if (doesAccountNotExist) {
        try {
          const account = await this._createSmartAccountInternal(options);
          return account;
        } catch (error) {
          // If it failed because the account already exists, get the existing account
          const doesAccountAlreadyExist = error instanceof APIError && error.statusCode === 409;
          if (doesAccountAlreadyExist) {
            const account = await this._getSmartAccountInternal(options);
            return account;
          }
          throw error;
        }
      }
      throw error;
    }
  }

  /**
   * Gets the price for a swap between two tokens on an EVM network.
   *
   * @param {GetSwapPriceOptions} options - The options for getting a swap price.
   *
   * @returns {Promise<GetSwapPriceResult | SwapUnavailableResult>} A promise that resolves to the swap price result or a response indicating that liquidity is unavailable.
   *
   * @example
   * ```typescript
   * const price = await cdp.evm.getSwapPrice({
   *   network: "ethereum-mainnet",
   *   toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
   *   fromToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
   *   fromAmount: BigInt("1000000000000000000"), // 1 WETH
   *   taker: "0x1234567890123456789012345678901234567890"
   * });
   * ```
   */
  async getSwapPrice(
    options: GetSwapPriceOptions,
  ): Promise<GetSwapPriceResult | SwapUnavailableResult> {
    Analytics.trackAction({
      action: "get_swap_price",
      properties: {
        network: options.network,
      },
    });

    return getSwapPrice(CdpOpenApiClient, options);
  }

  /**
   * Creates a quote for a swap between two tokens on an EVM network.
   *
   * @param {CreateSwapQuoteOptions} options - The options for creating a swap quote.
   *
   * @returns {Promise<CreateSwapQuoteResult | SwapUnavailableResult>} A promise that resolves to the swap quote result or a response indicating that liquidity is unavailable.
   *
   * @example
   * ```typescript
   * const swapQuote = await cdp.evm.createSwapQuote({
   *   network: "ethereum",
   *   toToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
   *   fromToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
   *   fromAmount: BigInt("1000000000000000000"), // 1 WETH
   *   taker: "0x1234567890123456789012345678901234567890"
   * });
   * ```
   */
  async createSwapQuote(
    options: CreateSwapQuoteOptions,
  ): Promise<CreateSwapQuoteResult | SwapUnavailableResult> {
    Analytics.trackAction({
      action: "create_swap_quote",
      properties: {
        network: options.network,
      },
    });

    return createSwapQuote(CdpOpenApiClient, options);
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
    Analytics.trackAction({
      action: "get_user_operation",
    });

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
    Analytics.trackAction({
      action: "list_accounts",
      accountType: "evm_server",
    });

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
    Analytics.trackAction({
      action: "list_token_balances",
      properties: {
        network: options.network,
      },
    });

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
   *          ```
   */
  async listSmartAccounts(options: ListSmartAccountsOptions = {}): Promise<ListSmartAccountResult> {
    Analytics.trackAction({
      action: "list_smart_accounts",
    });

    const smartAccounts = await CdpOpenApiClient.listEvmSmartAccounts({
      pageSize: options.pageSize,
      pageToken: options.pageToken,
    });

    return {
      accounts: smartAccounts.accounts.map(account => ({
        address: account.address as Address,
        owners: [account.owners[0] as Address],
        type: "evm-smart",
        policies: account.policies,
      })),
      nextPageToken: smartAccounts.nextPageToken,
    };
  }

  /**
   * Lists the spend permissions for a smart account.
   *
   * @param {ListSpendPermissionsOptions} options - Parameters for listing the spend permissions.
   * @param {string} options.address - The address of the smart account.
   * @param {number} [options.pageSize] - The number of spend permissions to return.
   * @param {string} [options.pageToken] - The page token to return the next page of spend permissions.
   *
   * @returns A promise that resolves to the spend permissions.
   */
  async listSpendPermissions(
    options: ListSpendPermissionsOptions,
  ): Promise<ListSpendPermissionsResult> {
    Analytics.trackAction({
      action: "list_spend_permissions",
    });

    return listSpendPermissions(CdpOpenApiClient, options);
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
    Analytics.trackAction({
      action: "prepare_user_operation",
      properties: {
        network: options.network,
      },
    });

    const userOp = await CdpOpenApiClient.prepareUserOperation(options.smartAccount.address, {
      network: options.network,
      calls: options.calls.map(call => ({
        to: call.to as Address,
        value: call.value.toString(),
        data: call.data as Hex,
        overrideGasLimit: call.overrideGasLimit,
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
   * Prepares and sends a user operation for a smart account.
   *
   * @param {PrepareAndSendUserOperationOptions} options - Parameters for preparing and sending the user operation.
   * @param {SmartAccount} options.smartAccount - The smart account signing the user operation.
   * @param {string} options.network - The network to prepare and send the user operation on.
   * @param {EvmCall[]} options.calls - The calls to include in the user operation.
   * @param {string} [options.paymasterUrl] - The optional paymaster URL to use for the user operation.
   *
   * @returns A promise that resolves to the smart account address, user operation hash, and status of the user operation.
   *
   * @example
   * ```ts
   * const { userOpHash } = await cdp.evm.prepareAndSendUserOperation({
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
  async prepareAndSendUserOperation(
    options: PrepareAndSendUserOperationOptions,
  ): Promise<PrepareAndSendUserOperationReturnType> {
    Analytics.trackAction({
      action: "prepare_and_send_user_operation",
      properties: {
        network: options.network,
      },
    });

    const userOp = await CdpOpenApiClient.prepareAndSendUserOperation(
      options.smartAccount.address,
      {
        network: options.network,
        calls: options.calls.map(call => ({
          to: call.to as Address,
          value: call.value.toString(),
          data: call.data as Hex,
        })),
        paymasterUrl: options.paymasterUrl,
      },
      options.idempotencyKey,
    );

    return {
      smartAccountAddress: options.smartAccount.address as Address,
      userOpHash: userOp.userOpHash as Hex,
      status: userOp.status as typeof EvmUserOperationStatus.broadcast,
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
    Analytics.trackAction({
      action: "request_faucet",
      properties: {
        network: options.network,
      },
    });

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
    Analytics.trackAction({
      action: "send_transaction",
      properties: {
        network: options.network,
      },
    });

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
    Analytics.trackAction({
      action: "send_user_operation",
      properties: {
        network: options.network,
      },
    });

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
    Analytics.trackAction({
      action: "sign_hash",
    });

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
   * Signs an EIP-191 message.
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
    Analytics.trackAction({
      action: "sign_message",
    });

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
    Analytics.trackAction({
      action: "sign_typed_data",
    });

    const { domain, message, primaryType } = options;
    const types = {
      EIP712Domain: getTypesForEIP712Domain({ domain }),
      ...options.types,
    };

    const openApiMessage: OpenAPIEIP712Message = {
      domain,
      types,
      primaryType,
      message,
    };

    const signature = await CdpOpenApiClient.signEvmTypedData(
      options.address,
      openApiMessage,
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
    Analytics.trackAction({
      action: "sign_transaction",
    });

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
    Analytics.trackAction({
      action: "update_account",
    });

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
   * Updates a CDP EVM smart account.
   *
   * @param {UpdateEvmSmartAccountOptions} [options] - Optional parameters for updating the account.
   * @param {string} options.address - The address of the account to update
   * @param {UpdateEvmSmartAccount} options.update - An object containing account fields to update.
   * @param {string} options.owner - The owner of the account.
   * @param {string} [options.update.name] - The new name for the account.
   * @param {string} [options.idempotencyKey] - An idempotency key.
   *
   * @returns A promise that resolves to the updated account.
   */
  async updateSmartAccount(options: UpdateEvmSmartAccountOptions): Promise<SmartAccount> {
    Analytics.trackAction({
      action: "update_smart_account",
    });

    const openApiSmartAccount = await CdpOpenApiClient.updateEvmSmartAccount(
      options.address,
      options.update,
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
    Analytics.trackAction({
      action: "wait_for_user_operation",
    });

    return waitForUserOperation(CdpOpenApiClient, {
      ...options,
    });
  }

  /**
   * Internal method to create an account without tracking analytics.
   * Used internally by composite operations to avoid double-counting.
   *
   * @param {CreateServerAccountOptions} options - Parameters for creating the account.
   * @returns {Promise<ServerAccount>} A promise that resolves to the newly created account.
   */
  private async _createAccountInternal(
    options: CreateServerAccountOptions = {},
  ): Promise<ServerAccount> {
    const openApiAccount = await CdpOpenApiClient.createEvmAccount(
      {
        name: options.name,
        accountPolicy: options.accountPolicy,
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
   * Internal method to get an account without tracking analytics.
   * Used internally by composite operations to avoid double-counting.
   *
   * @param {GetServerAccountOptions} options - Parameters for getting the account.
   * @returns {Promise<ServerAccount>} A promise that resolves to the account.
   */
  private async _getAccountInternal(options: GetServerAccountOptions): Promise<ServerAccount> {
    const openApiAccount = await (() => {
      if (options.address) {
        return CdpOpenApiClient.getEvmAccount(options.address);
      }

      if (options.name) {
        return CdpOpenApiClient.getEvmAccountByName(options.name);
      }

      throw new UserInputValidationError("Either address or name must be provided");
    })();

    const account = toEvmServerAccount(CdpOpenApiClient, {
      account: openApiAccount,
    });

    Analytics.wrapObjectMethodsWithErrorTracking(account);

    return account;
  }

  /**
   * Internal method to create a smart account without tracking analytics.
   * Used internally by composite operations to avoid double-counting.
   *
   * @param {CreateSmartAccountOptions} options - Parameters for creating the smart account.
   * @returns {Promise<SmartAccount>} A promise that resolves to the newly created smart account.
   */
  private async _createSmartAccountInternal(
    options: CreateSmartAccountOptions,
  ): Promise<SmartAccount> {
    const owners = [options.owner.address];

    if (options.enableSpendPermissions) {
      owners.push(SPEND_PERMISSION_MANAGER_ADDRESS);
    }

    const openApiSmartAccount = await CdpOpenApiClient.createEvmSmartAccount(
      {
        owners: owners,
        name: options.name,
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
   * Internal method to get a smart account without tracking analytics.
   * Used internally by composite operations to avoid double-counting.
   *
   * @param {GetSmartAccountOptions} options - Parameters for getting the smart account.
   * @returns {Promise<SmartAccount>} A promise that resolves to the smart account.
   */
  private async _getSmartAccountInternal(options: GetSmartAccountOptions): Promise<SmartAccount> {
    const openApiSmartAccount = await (async () => {
      if (options.address) {
        return CdpOpenApiClient.getEvmSmartAccount(options.address);
      } else if (options.name) {
        return CdpOpenApiClient.getEvmSmartAccountByName(options.name);
      }
      throw new UserInputValidationError("Either address or name must be provided");
    })();

    if (!openApiSmartAccount.owners.includes(options.owner.address)) {
      throw new UserInputValidationError(
        `Owner mismatch: The provided owner address is not an owner of the smart account. Please use a valid owner for this smart account.

Smart Account Address: ${openApiSmartAccount.address}
Smart Account Owners: ${openApiSmartAccount.owners.join(", ")}
Provided Owner Address: ${options.owner.address}\n`,
      );
    }

    const smartAccount = toEvmSmartAccount(CdpOpenApiClient, {
      smartAccount: openApiSmartAccount,
      owner: options.owner,
    });

    Analytics.wrapObjectMethodsWithErrorTracking(smartAccount);

    return smartAccount;
  }
}
