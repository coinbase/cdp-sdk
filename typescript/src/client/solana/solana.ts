import {
  SolanaClientInterface,
  Account,
  CreateAccountOptions,
  GetAccountOptions,
  ListAccountsOptions,
  RequestFaucetOptions,
  ListAccountsResult,
  SignatureResult,
  SignMessageOptions,
  SignTransactionOptions,
} from "./solana.types";
import { CdpOpenApiClient } from "../../openapi-client";

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
  async createAccount(options: CreateAccountOptions = {}): Promise<Account> {
    return CdpOpenApiClient.createSolanaAccount(options, options.idempotencyKey);
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
  async getAccount(options: GetAccountOptions): Promise<Account> {
    if (options.address) {
      return CdpOpenApiClient.getSolanaAccount(options.address);
    }

    if (options.name) {
      return CdpOpenApiClient.getSolanaAccountByName(options.name);
    }

    throw new Error("Either address or name must be provided");
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
    const solAccounts = await CdpOpenApiClient.listSolanaAccounts({
      pageSize: options.pageSize,
      pageToken: options.pageToken,
    });

    return {
      accounts: solAccounts.accounts,
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
    const signature = await CdpOpenApiClient.requestSolanaFaucet(
      { address: options.address, token: options.token },
      options.idempotencyKey,
    );

    return {
      signature: signature.transactionSignature,
    };
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
    return CdpOpenApiClient.signSolanaMessage(
      options.address,
      {
        message: options.message,
      },
      options.idempotencyKey,
    );
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
  async signTransaction(options: SignTransactionOptions): Promise<SignatureResult> {
    const signature = await CdpOpenApiClient.signSolanaTransaction(
      options.address,
      {
        transaction: options.transaction,
      },
      options.idempotencyKey,
    );

    return {
      signature: signature.signedTransaction,
    };
  }
}
