/**
 * @module Client
 */

import { constants, publicEncrypt } from "crypto";

import bs58 from "bs58";

import {
  CreateAccountOptions,
  ExportAccountOptions,
  GetAccountOptions,
  GetOrCreateAccountOptions,
  ImportAccountOptions,
  ListAccountsOptions,
  ListAccountsResult,
  ListTokenBalancesOptions,
  ListTokenBalancesResult,
  RequestFaucetOptions,
  SendTransactionOptions,
  SignatureResult,
  SignMessageOptions,
  SignTransactionOptions,
  SolanaClientInterface,
  UpdateSolanaAccountOptions,
} from "./solana.types.js";
import { toSolanaAccount } from "../../accounts/solana/toSolanaAccount.js";
import { SolanaAccount } from "../../accounts/solana/types.js";
import { requestFaucet } from "../../actions/solana/requestFaucet.js";
import {
  sendTransaction,
  type SendTransactionResult,
} from "../../actions/solana/sendTransaction.js";
import { signMessage } from "../../actions/solana/signMessage.js";
import {
  signTransaction,
  type SignTransactionResult,
} from "../../actions/solana/signTransaction.js";
import { Analytics } from "../../analytics.js";
import { ImportAccountPublicRSAKey } from "../../constants.js";
import { UserInputValidationError } from "../../errors.js";
import { APIError } from "../../openapi-client/errors.js";
import { CdpOpenApiClient } from "../../openapi-client/index.js";
import {
  decryptWithPrivateKey,
  formatSolanaPrivateKey,
  generateExportEncryptionKeyPair,
} from "../../utils/export.js";

/**
 * The namespace containing all Solana methods.
 */
export class SolanaClient implements SolanaClientInterface {
  /**
   * Creates a new Solana account.
   *
   * @param {CreateAccountOptions} options - Parameters for creating the Solana account.
   * @param {string} [options.name] - The name of the account.
   * @param {string} [options.idempotencyKey] - An idempotency key.
   *
   * @returns A promise that resolves to the newly created account.
   *
   * @example **Without arguments**
   *          ```ts
   *          const account = await cdp.solana.createAccount();
   *          ```
   *
   * @example **With a name**
   *          ```ts
   *          const account = await cdp.solana.createAccount({ name: "MyAccount" });
   *          ```
   *
   * @example **With an idempotency key**
   *          ```ts
   *          const idempotencyKey = uuidv4();
   *
   *          // First call
   *          await cdp.solana.createAccount({ idempotencyKey });
   *
   *          // Second call with the same idempotency key will return the same account
   *          await cdp.solana.createAccount({ idempotencyKey });
   *          ```
   */
  async createAccount(options: CreateAccountOptions = {}): Promise<SolanaAccount> {
    Analytics.trackAction({
      action: "create_account",
      accountType: "solana",
    });

    return this._createAccountInternal(options);
  }

  /**
   * Exports a CDP Solana account's private key.
   * It is important to store the private key in a secure place after it's exported.
   *
   * @param {ExportAccountOptions} options - Parameters for exporting the Solana account.
   * @param {string} [options.address] - The address of the account.
   * @param {string} [options.name] - The name of the account.
   *
   * @returns A promise that resolves to the exported account's full 64-byte private key as a base58 encoded string.
   *
   * @example **With an address**
   * ```ts
   * const privateKey = await cdp.solana.exportAccount({
   *   address: "1234567890123456789012345678901234567890",
   * });
   * ```
   *
   * @example **With a name**
   * ```ts
   * const privateKey = await cdp.solana.exportAccount({
   *   name: "MyAccount",
   * });
   * ```
   */
  async exportAccount(options: ExportAccountOptions): Promise<string> {
    Analytics.trackAction({
      action: "export_account",
      accountType: "solana",
    });

    const { publicKey, privateKey } = await generateExportEncryptionKeyPair();

    const { encryptedPrivateKey } = await (async () => {
      if (options.address) {
        return CdpOpenApiClient.exportSolanaAccount(
          options.address,
          {
            exportEncryptionKey: publicKey,
          },
          options.idempotencyKey,
        );
      }

      if (options.name) {
        return CdpOpenApiClient.exportSolanaAccountByName(
          options.name,
          {
            exportEncryptionKey: publicKey,
          },
          options.idempotencyKey,
        );
      }

      throw new UserInputValidationError("Either address or name must be provided");
    })();

    const decryptedPrivateKey = decryptWithPrivateKey(privateKey, encryptedPrivateKey);
    return formatSolanaPrivateKey(decryptedPrivateKey);
  }

  /**
   * Imports a Solana account using a private key.
   * The private key will be encrypted before being stored securely.
   *
   * @param {ImportAccountOptions} options - Parameters for importing the Solana account.
   * @param {string} options.privateKey - The private key to import (32 or 64 bytes). Can be a base58 encoded string or raw bytes.
   * @param {string} [options.name] - The name of the account.
   * @param {string} [options.encryptionPublicKey] - The RSA public key for encrypting the private key.
   * @param {string} [options.idempotencyKey] - An idempotency key.
   *
   * @returns A promise that resolves to the imported account.
   *
   * @example **Import with private key only**
   *          ```ts
   *          const account = await cdp.solana.importAccount({
   *            privateKey: "3Kzj...",
   *          });
   *          ```
   *
   * @example **Import with name**
   *          ```ts
   *          const account = await cdp.solana.importAccount({
   *            privateKey: "3Kzj...",
   *            name: "ImportedAccount",
   *          });
   *          ```
   *
   * @example **Import with idempotency key**
   *          ```ts
   *          const idempotencyKey = uuidv4();
   *
   *          const account = await cdp.solana.importAccount({
   *            privateKey: "3Kzj...",
   *            name: "ImportedAccount",
   *            idempotencyKey,
   *          });
   *          ```
   */
  async importAccount(options: ImportAccountOptions): Promise<SolanaAccount> {
    Analytics.trackAction({
      action: "import_account",
      accountType: "solana",
    });

    let privateKeyBytes: Uint8Array = new Uint8Array();

    if (typeof options.privateKey === "string") {
      privateKeyBytes = bs58.decode(options.privateKey);
    } else {
      privateKeyBytes = options.privateKey;
    }

    if (privateKeyBytes.length !== 32 && privateKeyBytes.length !== 64) {
      throw new UserInputValidationError("Invalid private key length");
    }

    if (privateKeyBytes.length === 64) {
      privateKeyBytes = privateKeyBytes.subarray(0, 32);
    }

    const encryptionPublicKey = options.encryptionPublicKey || ImportAccountPublicRSAKey;

    const encryptedPrivateKey = publicEncrypt(
      {
        key: encryptionPublicKey,
        padding: constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      privateKeyBytes,
    );

    const openApiAccount = await CdpOpenApiClient.importSolanaAccount(
      {
        encryptedPrivateKey: encryptedPrivateKey.toString("base64"),
        name: options.name,
      },
      options.idempotencyKey,
    );

    const account = toSolanaAccount(CdpOpenApiClient, {
      account: openApiAccount,
    });

    Analytics.wrapObjectMethodsWithErrorTracking(account);

    return account;
  }

  /**
   * Gets a Solana account by its address.
   *
   * @param {GetAccountOptions} options - Parameters for getting the Solana account.
   * Either `address` or `name` must be provided.
   * If both are provided, lookup will be done by `address` and `name` will be ignored.
   * @param {string} [options.address] - The address of the account.
   * @param {string} [options.name] - The name of the account.
   *
   * @returns A promise that resolves to the account.
   *
   * @example **Get an account by address**
   *          ```ts
   *          const account = await cdp.solana.getAccount({
   *            address: "1234567890123456789012345678901234567890",
   *          });
   *          ```
   *
   * @example **Get an account by name**
   *          ```ts
   *          const account = await cdp.solana.getAccount({
   *            name: "MyAccount",
   *          });
   *          ```
   */
  async getAccount(options: GetAccountOptions): Promise<SolanaAccount> {
    Analytics.trackAction({
      action: "get_account",
      accountType: "solana",
    });

    return this._getAccountInternal(options);
  }

  /**
   * Gets a Solana account by its address.
   *
   * @param {GetOrCreateAccountOptions} options - Parameters for getting or creating the Solana account.
   * @param {string} options.name - The name of the account.
   *
   * @returns A promise that resolves to the account.
   *
   * @example
   * ```ts
   * const account = await cdp.solana.getOrCreateAccount({
   *   name: "MyAccount",
   * });
   * ```
   */
  async getOrCreateAccount(options: GetOrCreateAccountOptions): Promise<SolanaAccount> {
    Analytics.trackAction({
      action: "get_or_create_account",
      accountType: "solana",
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
   * Lists all Solana accounts.
   *
   * @param {ListAccountsOptions} options - Parameters for listing the Solana accounts.
   * @param {number} [options.pageSize] - The number of accounts to return.
   * @param {string} [options.pageToken] - The page token to begin listing from.
   * This is obtained by previous calls to this method.
   *
   * @returns A promise that resolves to an array of Solana account instances.
   *
   * @example **Without arguments**
   *          ```ts
   *          const accounts = await cdp.solana.listAccounts();
   *          ```
   *
   * @example **With pagination**
   *          ```ts
   *          let page = await cdp.solana.listAccounts();
   *
   *          while (page.nextPageToken) {
   *            page = await cdp.solana.listAccounts({ pageToken: page.nextPageToken });
   *          }
   *
   *          page.accounts.forEach(account => console.log(account));
   *          ```
   * }
   * ```
   */
  async listAccounts(options: ListAccountsOptions = {}): Promise<ListAccountsResult> {
    Analytics.trackAction({
      action: "list_accounts",
      accountType: "solana",
    });

    const solAccounts = await CdpOpenApiClient.listSolanaAccounts({
      pageSize: options.pageSize,
      pageToken: options.pageToken,
    });

    return {
      accounts: solAccounts.accounts.map(account => {
        const solanaAccount = toSolanaAccount(CdpOpenApiClient, {
          account,
        });

        Analytics.wrapObjectMethodsWithErrorTracking(solanaAccount);

        return solanaAccount;
      }),
      nextPageToken: solAccounts.nextPageToken,
    };
  }

  /**
   * Requests funds from a Solana faucet.
   *
   * @param {RequestFaucetOptions} options - Parameters for requesting funds from the Solana faucet.
   * @param {string} options.address - The address to request funds for.
   * @param {string} options.token - The token to request funds for.
   * @param {string} [options.idempotencyKey] - An idempotency key.
   *
   * @returns A promise that resolves to the transaction signature.
   *
   * @example
   *          ```ts
   *          const signature = await cdp.solana.requestFaucet({
   *            address: "1234567890123456789012345678901234567890",
   *            token: "sol",
   *          });
   *          ```
   */
  async requestFaucet(options: RequestFaucetOptions): Promise<SignatureResult> {
    Analytics.trackAction({
      action: "request_faucet",
      accountType: "solana",
    });

    return requestFaucet(CdpOpenApiClient, options);
  }

  /**
   * Signs a message.
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
   * // Create a Solana account
   * const account = await cdp.solana.createAccount();
   *
   * // When you want to sign a message, you can do so by address
   * const signature = await cdp.solana.signMessage({
   *   address: account.address,
   *   message: "Hello, world!",
   * });
   * ```
   */
  async signMessage(options: SignMessageOptions): Promise<SignatureResult> {
    Analytics.trackAction({
      action: "sign_message",
      accountType: "solana",
    });

    return signMessage(CdpOpenApiClient, options);
  }

  /**
   * Signs a transaction.
   *
   * @param {SignTransactionOptions} options - Parameters for signing the transaction.
   * @param {string} options.address - The address to sign the transaction for.
   * @param {string} options.transaction - The transaction to sign.
   * @param {string} [options.idempotencyKey] - An idempotency key.
   *
   * @returns A promise that resolves to the signature.
   *
   * @example
   * ```ts
   * // Create a Solana account
   * const account = await cdp.solana.createAccount();
   *
   * // Add your transaction instructions here
   * const transaction = new Transaction()
   *
   * // Make sure to set requireAllSignatures to false, since signing will be done through the API
   * const serializedTransaction = transaction.serialize({
   *   requireAllSignatures: false,
   * });
   *
   * // Base64 encode the serialized transaction
   * const transaction = Buffer.from(serializedTransaction).toString("base64");
   *
   * // When you want to sign a transaction, you can do so by address and base64 encoded transaction
   * const signature = await cdp.solana.signTransaction({
   *   address: account.address,
   *   transaction,
   * });
   * ```
   */
  async signTransaction(options: SignTransactionOptions): Promise<SignTransactionResult> {
    Analytics.trackAction({
      action: "sign_transaction",
      accountType: "solana",
    });

    return signTransaction(CdpOpenApiClient, options);
  }

  /**
   * Updates a CDP Solana account.
   *
   * @param {UpdateSolanaAccountOptions} [options] - Optional parameters for creating the account.
   * @param {string} options.address - The address of the account to update
   * @param {UpdateSolanaAccountBody} options.update - An object containing account fields to update.
   * @param {string} [options.update.name] - The new name for the account.
   * @param {string} [options.update.accountPolicy] - The ID of a Policy to apply to the account.
   * @param {string} [options.idempotencyKey] - An idempotency key.
   *
   * @returns A promise that resolves to the updated account.
   *
   * @example **With a name**
   *          ```ts
   *          const account = await cdp.sol.updateAccount({ address: "...", update: { name: "New Name" } });
   *          ```
   *
   * @example **With an account policy**
   *          ```ts
   *          const account = await cdp.sol.updateAccount({ address: "...", update: { accountPolicy: "73bcaeeb-d7af-4615-b064-42b5fe83a31e" } });
   *          ```
   *
   * @example **With an idempotency key**
   *          ```ts
   *          const idempotencyKey = uuidv4();
   *
   *          // First call
   *          await cdp.sol.updateAccount({
   *            address: "0x...",
   *            update: { accountPolicy: "73bcaeeb-d7af-4615-b064-42b5fe83a31e" },
   *            idempotencyKey,
   *          });
   *
   *          // Second call with the same idempotency key will not update
   *          await cdp.sol.updateAccount({
   *            address: '0x...',
   *            update: { name: "" },
   *            idempotencyKey,
   *          });
   *          ```
   */
  async updateAccount(options: UpdateSolanaAccountOptions): Promise<SolanaAccount> {
    Analytics.trackAction({
      action: "update_account",
      accountType: "solana",
    });

    const openApiAccount = await CdpOpenApiClient.updateSolanaAccount(
      options.address,
      options.update,
      options.idempotencyKey,
    );

    const account = toSolanaAccount(CdpOpenApiClient, {
      account: openApiAccount,
    });

    Analytics.wrapObjectMethodsWithErrorTracking(account);

    return account;
  }

  /**
   * Sends a Solana transaction using the Coinbase API.
   *
   * @param {SendTransactionOptions} options - Parameters for sending the Solana transaction.
   * @param {string} options.network - The network to send the transaction to.
   * @param {string} options.transaction - The base64 encoded transaction to send.
   * @param {string} [options.idempotencyKey] - An idempotency key.
   *
   * @returns A promise that resolves to the transaction result.
   *
   * @example
   * ```ts
   * const signature = await cdp.solana.sendTransaction({
   *   network: "solana-devnet",
   *   transaction: "...",
   * });
   * ```
   */
  async sendTransaction(options: SendTransactionOptions): Promise<SendTransactionResult> {
    Analytics.trackAction({
      action: "send_transaction",
      accountType: "solana",
      properties: {
        network: options.network,
      },
    });

    return sendTransaction(CdpOpenApiClient, options);
  }

  /**
   * Lists the token balances for a Solana account.
   *
   * @param {ListTokenBalancesOptions} options - Parameters for listing the Solana token balances.
   * @param {string} options.address - The address of the account to list token balances for.
   * @param {string} [options.network] - The network to list token balances for. Defaults to "solana".
   * @param {number} [options.pageSize] - The number of token balances to return.
   * @param {string} [options.pageToken] - The page token to begin listing from.
   * This is obtained by previous calls to this method.
   *
   * @returns A promise that resolves to an array of Solana token balance instances.
   *
   * @example
   * ```ts
   * const balances = await cdp.solana.listTokenBalances({ address: "...", network: "solana-devnet" });
   * ```
   */
  async listTokenBalances(options: ListTokenBalancesOptions): Promise<ListTokenBalancesResult> {
    Analytics.trackAction({
      action: "list_token_balances",
      accountType: "solana",
      properties: {
        network: options.network,
      },
    });

    const tokenBalances = await CdpOpenApiClient.listSolanaTokenBalances(
      options.network || "solana",
      options.address,
      {
        pageSize: options.pageSize,
        pageToken: options.pageToken,
      },
    );

    return {
      balances: tokenBalances.balances.map(balance => {
        return {
          amount: {
            amount: BigInt(balance.amount.amount),
            decimals: balance.amount.decimals,
          },
          token: {
            mintAddress: balance.token.mintAddress,
            name: balance.token.name,
            symbol: balance.token.symbol,
          },
        };
      }),
      nextPageToken: tokenBalances.nextPageToken,
    };
  }

  /**
   * Internal method to create a Solana account without tracking analytics.
   * Used internally by composite operations to avoid double-counting.
   *
   * @param {CreateAccountOptions} options - Parameters for creating the account.
   * @returns {Promise<SolanaAccount>} A promise that resolves to the newly created account.
   */
  private async _createAccountInternal(options: CreateAccountOptions = {}): Promise<SolanaAccount> {
    const openApiAccount = await CdpOpenApiClient.createSolanaAccount(
      {
        name: options.name,
        accountPolicy: options.accountPolicy,
      },
      options.idempotencyKey,
    );

    const account = toSolanaAccount(CdpOpenApiClient, {
      account: openApiAccount,
    });

    Analytics.wrapObjectMethodsWithErrorTracking(account);

    return account;
  }

  /**
   * Internal method to get a Solana account without tracking analytics.
   * Used internally by composite operations to avoid double-counting.
   *
   * @param {GetAccountOptions} options - Parameters for getting the account.
   * @returns {Promise<SolanaAccount>} A promise that resolves to the account.
   */
  private async _getAccountInternal(options: GetAccountOptions): Promise<SolanaAccount> {
    const openApiAccount = await (() => {
      if (options.address) {
        return CdpOpenApiClient.getSolanaAccount(options.address);
      }

      if (options.name) {
        return CdpOpenApiClient.getSolanaAccountByName(options.name);
      }

      throw new UserInputValidationError("Either address or name must be provided");
    })();

    const account = toSolanaAccount(CdpOpenApiClient, {
      account: openApiAccount,
    });

    Analytics.wrapObjectMethodsWithErrorTracking(account);

    return account;
  }
}
