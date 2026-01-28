import type {
  CreateEndUserBody,
  ListEndUsersParams,
  ImportEndUserBodyKeyType,
  AuthenticationMethods,
  AddEndUserEvmAccount201,
  AddEndUserEvmSmartAccount201,
  AddEndUserSolanaAccount201,
  EndUser as OpenAPIEndUser,
} from "../../openapi-client/index.js";
import type { Prettify } from "../../types/utils.js";

/**
 * The options for validating an access token.
 */
export interface ValidateAccessTokenOptions {
  /**
   * The access token to validate.
   */
  accessToken: string;
}

/**
 * The options for getting an end user.
 */
export interface GetEndUserOptions {
  /**
   * The unique identifier of the end user to retrieve.
   */
  userId: string;
}

/**
 * The options for listing end users.
 */
export type ListEndUsersOptions = ListEndUsersParams;

/**
 * The options for creating an end user.
 */
export type CreateEndUserOptions = CreateEndUserBody;

/**
 * The options for adding an EVM account to an end user.
 */
export interface AddEndUserEvmAccountOptions {
  /**
   * The unique identifier of the end user.
   */
  userId: string;
}

/**
 * The result of adding an EVM account to an end user.
 */
export type AddEndUserEvmAccountResult = AddEndUserEvmAccount201;

/**
 * The options for adding an EVM smart account to an end user.
 */
export interface AddEndUserEvmSmartAccountOptions {
  /**
   * The unique identifier of the end user.
   */
  userId: string;
  /**
   * If true, enables spend permissions for the EVM smart account.
   */
  enableSpendPermissions: boolean;
}

/**
 * The result of adding an EVM smart account to an end user.
 */
export type AddEndUserEvmSmartAccountResult = AddEndUserEvmSmartAccount201;

/**
 * The options for adding a Solana account to an end user.
 */
export interface AddEndUserSolanaAccountOptions {
  /**
   * The unique identifier of the end user.
   */
  userId: string;
}

/**
 * The result of adding a Solana account to an end user.
 */
export type AddEndUserSolanaAccountResult = AddEndUserSolanaAccount201;

/**
 * The options for importing an end user.
 */
export interface ImportEndUserOptions {
  /**
   * A stable, unique identifier for the end user.
   * If not provided, a UUID will be generated.
   */
  userId?: string;
  /**
   * The authentication methods for the end user.
   */
  authenticationMethods: AuthenticationMethods;
  /**
   * The private key to import.
   * - For EVM: hex string (with or without 0x prefix)
   * - For Solana: base58 encoded string or raw bytes (Uint8Array, 32 or 64 bytes)
   * The SDK will encrypt this before sending to the API.
   */
  privateKey: string | Uint8Array;
  /**
   * The type of key being imported ("evm" or "solana").
   */
  keyType: ImportEndUserBodyKeyType;
  /**
   * Optional RSA public key to encrypt the private key.
   * Defaults to the known CDP public key.
   */
  encryptionPublicKey?: string;
}

/**
 * The options for adding an EVM smart account to an EndUser object.
 */
export interface AddEvmSmartAccountOptions {
  /**
   * If true, enables spend permissions for the EVM smart account.
   */
  enableSpendPermissions: boolean;
}

/**
 * Actions that can be performed on an EndUser object.
 */
export type EndUserAccountActions = {
  /**
   * Adds an EVM EOA (Externally Owned Account) to this end user.
   * End users can have up to 10 EVM accounts.
   *
   * @returns A promise that resolves to the newly created EVM EOA account.
   *
   * @example
   * ```ts
   * const endUser = await cdp.endUser.createEndUser({
   *   authenticationMethods: [{ type: "email", email: "user@example.com" }]
   * });
   *
   * const result = await endUser.addEvmAccount();
   * console.log(result.evmAccount.address);
   * ```
   */
  addEvmAccount: () => Promise<AddEndUserEvmAccountResult>;

  /**
   * Adds an EVM smart account to this end user.
   * This also creates a new EVM EOA account to serve as the owner of the smart account.
   *
   * @param options - The options for adding the EVM smart account.
   *
   * @returns A promise that resolves to the newly created EVM smart account.
   *
   * @example
   * ```ts
   * const endUser = await cdp.endUser.createEndUser({
   *   authenticationMethods: [{ type: "email", email: "user@example.com" }]
   * });
   *
   * const result = await endUser.addEvmSmartAccount({ enableSpendPermissions: true });
   * console.log(result.evmSmartAccount.address);
   * ```
   */
  addEvmSmartAccount: (
    options: AddEvmSmartAccountOptions,
  ) => Promise<AddEndUserEvmSmartAccountResult>;

  /**
   * Adds a Solana account to this end user.
   * End users can have up to 10 Solana accounts.
   *
   * @returns A promise that resolves to the newly created Solana account.
   *
   * @example
   * ```ts
   * const endUser = await cdp.endUser.createEndUser({
   *   authenticationMethods: [{ type: "email", email: "user@example.com" }]
   * });
   *
   * const result = await endUser.addSolanaAccount();
   * console.log(result.solanaAccount.address);
   * ```
   */
  addSolanaAccount: () => Promise<AddEndUserSolanaAccountResult>;
};

/**
 * An end user with actions that can be performed directly on the object.
 *
 * @see {@link OpenAPIEndUser}
 * @see {@link EndUserAccountActions}
 */
export type EndUserAccount = Prettify<OpenAPIEndUser & EndUserAccountActions>;
