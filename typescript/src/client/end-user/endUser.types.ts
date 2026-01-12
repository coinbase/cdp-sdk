import type {
  CreateEndUserBody,
  ListEndUsersParams,
  ImportEndUserBodyKeyType,
  AuthenticationMethods,
} from "../../openapi-client/index.js";

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
