import type {
  CreateEndUserBody,
  ListEndUsersParams,
  ImportEndUserBodyKeyType,
  AuthenticationMethods,
  AddEndUserEvmAccount201,
  AddEndUserEvmSmartAccount201,
  AddEndUserSolanaAccount201,
  EndUser as OpenAPIEndUser,
  SignEvmHashWithEndUserAccount200,
  SignEvmTransactionWithEndUserAccount200,
  SignEvmMessageWithEndUserAccount200,
  SignEvmTypedDataWithEndUserAccount200,
  SendEvmTransactionWithEndUserAccount200,
  SendEvmTransactionWithEndUserAccountBodyNetwork,
  SendEvmAssetWithEndUserAccount200,
  SendEvmAssetWithEndUserAccountBodyNetwork,
  SendUserOperationWithEndUserAccountResult,
  EvmUserOperationNetwork,
  EvmCall,
  CreateEvmEip7702DelegationWithEndUserAccount201,
  EvmEip7702DelegationNetwork,
  SignSolanaHashWithEndUserAccount200,
  SignSolanaMessageWithEndUserAccount200,
  SignSolanaTransactionWithEndUserAccount200,
  SendSolanaTransactionWithEndUserAccount200,
  SendSolanaTransactionWithEndUserAccountBodyNetwork,
  SendSolanaAssetWithEndUserAccount200,
  SendSolanaAssetWithEndUserAccountBodyNetwork,
  EIP712Message,
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
 * The options for revoking all active delegations for an end user.
 */
export interface RevokeDelegationForEndUserOptions {
  /**
   * The unique identifier of the end user.
   */
  userId: string;
}

// ─── EVM Sign Options/Results ───

/**
 * The options for signing an EVM hash on behalf of an end user.
 */
export interface SignEvmHashOptions {
  /** The unique identifier of the end user. */
  userId: string;
  /** The 32-byte hash to sign, hex-encoded. */
  hash: string;
  /** The EVM address to sign with. */
  address: string;
}

/**
 * The result of signing an EVM hash on behalf of an end user.
 */
export type SignEvmHashResult = SignEvmHashWithEndUserAccount200;

/**
 * The options for signing an EVM transaction on behalf of an end user.
 */
export interface SignEvmTransactionOptions {
  /** The unique identifier of the end user. */
  userId: string;
  /** The EVM address to sign with. */
  address: string;
  /** The RLP-serialized EIP-1559 transaction to sign, hex-encoded. */
  transaction: string;
}

/**
 * The result of signing an EVM transaction on behalf of an end user.
 */
export type SignEvmTransactionResult = SignEvmTransactionWithEndUserAccount200;

/**
 * The options for signing an EVM message on behalf of an end user.
 */
export interface SignEvmMessageOptions {
  /** The unique identifier of the end user. */
  userId: string;
  /** The EVM address to sign with. */
  address: string;
  /** The EIP-191 message to sign. */
  message: string;
}

/**
 * The result of signing an EVM message on behalf of an end user.
 */
export type SignEvmMessageResult = SignEvmMessageWithEndUserAccount200;

/**
 * The options for signing EVM EIP-712 typed data on behalf of an end user.
 */
export interface SignEvmTypedDataOptions {
  /** The unique identifier of the end user. */
  userId: string;
  /** The EVM address to sign with. */
  address: string;
  /** The EIP-712 typed data to sign. */
  typedData: EIP712Message;
}

/**
 * The result of signing EVM typed data on behalf of an end user.
 */
export type SignEvmTypedDataResult = SignEvmTypedDataWithEndUserAccount200;

// ─── EVM Send Options/Results ───

/**
 * The options for sending an EVM transaction on behalf of an end user.
 */
export interface SendEvmTransactionOptions {
  /** The unique identifier of the end user. */
  userId: string;
  /** The EVM address to send from. */
  address: string;
  /** The RLP-serialized EIP-1559 transaction to send, hex-encoded. */
  transaction: string;
  /** The network to send the transaction on. */
  network: SendEvmTransactionWithEndUserAccountBodyNetwork;
}

/**
 * The result of sending an EVM transaction on behalf of an end user.
 */
export type SendEvmTransactionResult = SendEvmTransactionWithEndUserAccount200;

/**
 * The options for sending an EVM asset on behalf of an end user.
 */
export interface SendEvmAssetOptions {
  /** The unique identifier of the end user. */
  userId: string;
  /** The EVM address to send from. */
  address: string;
  /** The asset to send. Defaults to "usdc". */
  asset?: "usdc";
  /** The recipient address. */
  to: string;
  /** The amount to send. */
  amount: string;
  /** The network to send on. */
  network: SendEvmAssetWithEndUserAccountBodyNetwork;
  /** Whether to use the CDP paymaster. */
  useCdpPaymaster?: boolean;
  /** A custom paymaster URL. */
  paymasterUrl?: string;
}

/**
 * The result of sending an EVM asset on behalf of an end user.
 */
export type SendEvmAssetResult = SendEvmAssetWithEndUserAccount200;

/**
 * The options for sending a user operation on behalf of an end user.
 */
export interface SendUserOperationOptions {
  /** The unique identifier of the end user. */
  userId: string;
  /** The EVM smart account address. */
  address: string;
  /** The network to send the user operation on. */
  network: EvmUserOperationNetwork;
  /** The calls to execute. */
  calls: EvmCall[];
  /** Whether to use the CDP paymaster. */
  useCdpPaymaster: boolean;
  /** A custom paymaster URL. */
  paymasterUrl?: string;
  /** An optional data suffix. */
  dataSuffix?: string;
}

/**
 * The result of sending a user operation on behalf of an end user.
 */
export type SendUserOperationResult = SendUserOperationWithEndUserAccountResult;

// ─── EVM EIP-7702 Delegation Options/Results ───

/**
 * The options for creating an EVM EIP-7702 delegation on behalf of an end user.
 */
export interface CreateEvmEip7702DelegationOptions {
  /** The unique identifier of the end user. */
  userId: string;
  /** The EVM address to delegate. */
  address: string;
  /** The network for the delegation. */
  network: EvmEip7702DelegationNetwork;
  /** Whether to enable spend permissions for the delegation. */
  enableSpendPermissions?: boolean;
}

/**
 * The result of creating an EVM EIP-7702 delegation on behalf of an end user.
 */
export type CreateEvmEip7702DelegationForEndUserResult =
  CreateEvmEip7702DelegationWithEndUserAccount201;

// ─── Solana Sign Options/Results ───

/**
 * The options for signing a Solana hash on behalf of an end user.
 */
export interface SignSolanaHashOptions {
  /** The unique identifier of the end user. */
  userId: string;
  /** The 32-byte hash to sign. */
  hash: string;
  /** The Solana address to sign with. */
  address: string;
}

/**
 * The result of signing a Solana hash on behalf of an end user.
 */
export type SignSolanaHashResult = SignSolanaHashWithEndUserAccount200;

/**
 * The options for signing a Solana message on behalf of an end user.
 */
export interface SignSolanaMessageOptions {
  /** The unique identifier of the end user. */
  userId: string;
  /** The Solana address to sign with. */
  address: string;
  /** The base64-encoded message to sign. */
  message: string;
}

/**
 * The result of signing a Solana message on behalf of an end user.
 */
export type SignSolanaMessageResult = SignSolanaMessageWithEndUserAccount200;

/**
 * The options for signing a Solana transaction on behalf of an end user.
 */
export interface SignSolanaTransactionOptions {
  /** The unique identifier of the end user. */
  userId: string;
  /** The Solana address to sign with. */
  address: string;
  /** The base64-encoded Solana transaction to sign. */
  transaction: string;
}

/**
 * The result of signing a Solana transaction on behalf of an end user.
 */
export type SignSolanaTransactionResult = SignSolanaTransactionWithEndUserAccount200;

// ─── Solana Send Options/Results ───

/**
 * The options for sending a Solana transaction on behalf of an end user.
 */
export interface SendSolanaTransactionOptions {
  /** The unique identifier of the end user. */
  userId: string;
  /** The Solana address to send from. */
  address: string;
  /** The base64-encoded Solana transaction to send. */
  transaction: string;
  /** The Solana network to send on. */
  network: SendSolanaTransactionWithEndUserAccountBodyNetwork;
}

/**
 * The result of sending a Solana transaction on behalf of an end user.
 */
export type SendSolanaTransactionResult = SendSolanaTransactionWithEndUserAccount200;

/**
 * The options for sending a Solana asset on behalf of an end user.
 */
export interface SendSolanaAssetOptions {
  /** The unique identifier of the end user. */
  userId: string;
  /** The Solana address to send from. */
  address: string;
  /** The asset to send. Defaults to "usdc". */
  asset?: "usdc";
  /** The recipient address. */
  to: string;
  /** The amount to send. */
  amount: string;
  /** The Solana network to send on. */
  network: SendSolanaAssetWithEndUserAccountBodyNetwork;
  /** Whether to create the recipient's associated token account if it doesn't exist. */
  createRecipientAta?: boolean;
}

/**
 * The result of sending a Solana asset on behalf of an end user.
 */
export type SendSolanaAssetResult = SendSolanaAssetWithEndUserAccount200;

// ─── EndUserAccount Action Method Options (address optional, userId auto-bound) ───

/**
 * The options for signing an EVM hash on an EndUser object.
 */
export interface AccountSignEvmHashOptions {
  /** The 32-byte hash to sign, hex-encoded. */
  hash: string;
  /** The EVM address to sign with. Uses the first EVM account if not provided. */
  address?: string;
}

/**
 * The options for signing an EVM transaction on an EndUser object.
 */
export interface AccountSignEvmTransactionOptions {
  /** The EVM address to sign with. Uses the first EVM account if not provided. */
  address?: string;
  /** The RLP-serialized EIP-1559 transaction to sign, hex-encoded. */
  transaction: string;
}

/**
 * The options for signing an EVM message on an EndUser object.
 */
export interface AccountSignEvmMessageOptions {
  /** The EVM address to sign with. Uses the first EVM account if not provided. */
  address?: string;
  /** The EIP-191 message to sign. */
  message: string;
}

/**
 * The options for signing EVM typed data on an EndUser object.
 */
export interface AccountSignEvmTypedDataOptions {
  /** The EVM address to sign with. Uses the first EVM account if not provided. */
  address?: string;
  /** The EIP-712 typed data to sign. */
  typedData: EIP712Message;
}

/**
 * The options for sending an EVM transaction on an EndUser object.
 */
export interface AccountSendEvmTransactionOptions {
  /** The EVM address to send from. Uses the first EVM account if not provided. */
  address?: string;
  /** The RLP-serialized EIP-1559 transaction to send, hex-encoded. */
  transaction: string;
  /** The network to send the transaction on. */
  network: SendEvmTransactionWithEndUserAccountBodyNetwork;
}

/**
 * The options for sending an EVM asset on an EndUser object.
 */
export interface AccountSendEvmAssetOptions {
  /** The EVM address to send from. Uses the first EVM account if not provided. */
  address?: string;
  /** The asset to send. Defaults to "usdc". */
  asset?: "usdc";
  /** The recipient address. */
  to: string;
  /** The amount to send. */
  amount: string;
  /** The network to send on. */
  network: SendEvmAssetWithEndUserAccountBodyNetwork;
  /** Whether to use the CDP paymaster. */
  useCdpPaymaster?: boolean;
  /** A custom paymaster URL. */
  paymasterUrl?: string;
}

/**
 * The options for sending a user operation on an EndUser object.
 */
export interface AccountSendUserOperationOptions {
  /** The EVM smart account address. Uses the first smart account if not provided. */
  address?: string;
  /** The network to send the user operation on. */
  network: EvmUserOperationNetwork;
  /** The calls to execute. */
  calls: EvmCall[];
  /** Whether to use the CDP paymaster. */
  useCdpPaymaster: boolean;
  /** A custom paymaster URL. */
  paymasterUrl?: string;
  /** An optional data suffix. */
  dataSuffix?: string;
}

/**
 * The options for creating an EVM EIP-7702 delegation on an EndUser object.
 */
export interface AccountCreateEvmEip7702DelegationOptions {
  /** The EVM address to delegate. Uses the first EVM account if not provided. */
  address?: string;
  /** The network for the delegation. */
  network: EvmEip7702DelegationNetwork;
  /** Whether to enable spend permissions for the delegation. */
  enableSpendPermissions?: boolean;
}

/**
 * The options for signing a Solana hash on an EndUser object.
 */
export interface AccountSignSolanaHashOptions {
  /** The 32-byte hash to sign. */
  hash: string;
  /** The Solana address to sign with. Uses the first Solana account if not provided. */
  address?: string;
}

/**
 * The options for signing a Solana message on an EndUser object.
 */
export interface AccountSignSolanaMessageOptions {
  /** The Solana address to sign with. Uses the first Solana account if not provided. */
  address?: string;
  /** The base64-encoded message to sign. */
  message: string;
}

/**
 * The options for signing a Solana transaction on an EndUser object.
 */
export interface AccountSignSolanaTransactionOptions {
  /** The Solana address to sign with. Uses the first Solana account if not provided. */
  address?: string;
  /** The base64-encoded Solana transaction to sign. */
  transaction: string;
}

/**
 * The options for sending a Solana transaction on an EndUser object.
 */
export interface AccountSendSolanaTransactionOptions {
  /** The Solana address to send from. Uses the first Solana account if not provided. */
  address?: string;
  /** The base64-encoded Solana transaction to send. */
  transaction: string;
  /** The Solana network to send on. */
  network: SendSolanaTransactionWithEndUserAccountBodyNetwork;
}

/**
 * The options for sending a Solana asset on an EndUser object.
 */
export interface AccountSendSolanaAssetOptions {
  /** The Solana address to send from. Uses the first Solana account if not provided. */
  address?: string;
  /** The asset to send. Defaults to "usdc". */
  asset?: "usdc";
  /** The recipient address. */
  to: string;
  /** The amount to send. */
  amount: string;
  /** The Solana network to send on. */
  network: SendSolanaAssetWithEndUserAccountBodyNetwork;
  /** Whether to create the recipient's associated token account if it doesn't exist. */
  createRecipientAta?: boolean;
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

  /**
   * Revokes all active delegations for this end user.
   * This operation can be performed by the end user themselves or by a developer using their API key.
   *
   * @returns A promise that resolves when the delegation has been revoked.
   *
   * @example
   * ```ts
   * const endUser = await cdp.endUser.getEndUser({ userId: "user-123" });
   *
   * await endUser.revokeDelegation();
   * ```
   */
  revokeDelegation: () => Promise<void>;

  // ─── Delegated EVM Sign Methods ───

  /**
   * Signs an EVM hash on behalf of this end user using a delegation.
   *
   * @param options - The signing options.
   * @returns A promise that resolves to the signature.
   */
  signEvmHash: (options: AccountSignEvmHashOptions) => Promise<SignEvmHashResult>;

  /**
   * Signs an EVM transaction on behalf of this end user using a delegation.
   *
   * @param options - The signing options.
   * @returns A promise that resolves to the signed transaction.
   */
  signEvmTransaction: (
    options: AccountSignEvmTransactionOptions,
  ) => Promise<SignEvmTransactionResult>;

  /**
   * Signs an EVM message on behalf of this end user using a delegation.
   *
   * @param options - The signing options.
   * @returns A promise that resolves to the signature.
   */
  signEvmMessage: (options: AccountSignEvmMessageOptions) => Promise<SignEvmMessageResult>;

  /**
   * Signs EVM EIP-712 typed data on behalf of this end user using a delegation.
   *
   * @param options - The signing options.
   * @returns A promise that resolves to the signature.
   */
  signEvmTypedData: (options: AccountSignEvmTypedDataOptions) => Promise<SignEvmTypedDataResult>;

  // ─── Delegated EVM Send Methods ───

  /**
   * Sends an EVM transaction on behalf of this end user using a delegation.
   *
   * @param options - The send options.
   * @returns A promise that resolves to the transaction hash.
   */
  sendEvmTransaction: (
    options: AccountSendEvmTransactionOptions,
  ) => Promise<SendEvmTransactionResult>;

  /**
   * Sends an EVM asset on behalf of this end user using a delegation.
   *
   * @param options - The send options.
   * @returns A promise that resolves to the transaction result.
   */
  sendEvmAsset: (options: AccountSendEvmAssetOptions) => Promise<SendEvmAssetResult>;

  /**
   * Sends a user operation on behalf of this end user using a delegation.
   *
   * @param options - The send options.
   * @returns A promise that resolves to the user operation result.
   */
  sendUserOperation: (options: AccountSendUserOperationOptions) => Promise<SendUserOperationResult>;

  // ─── Delegated EVM EIP-7702 Delegation Method ───

  /**
   * Creates an EVM EIP-7702 delegation on behalf of this end user.
   *
   * @param options - The delegation options.
   * @returns A promise that resolves to the delegation operation ID.
   */
  createEvmEip7702Delegation: (
    options: AccountCreateEvmEip7702DelegationOptions,
  ) => Promise<CreateEvmEip7702DelegationForEndUserResult>;

  // ─── Delegated Solana Sign Methods ───

  /**
   * Signs a Solana hash on behalf of this end user using a delegation.
   *
   * @param options - The signing options.
   * @returns A promise that resolves to the signature.
   */
  signSolanaHash: (options: AccountSignSolanaHashOptions) => Promise<SignSolanaHashResult>;

  /**
   * Signs a Solana message on behalf of this end user using a delegation.
   *
   * @param options - The signing options.
   * @returns A promise that resolves to the signature.
   */
  signSolanaMessage: (options: AccountSignSolanaMessageOptions) => Promise<SignSolanaMessageResult>;

  /**
   * Signs a Solana transaction on behalf of this end user using a delegation.
   *
   * @param options - The signing options.
   * @returns A promise that resolves to the signed transaction.
   */
  signSolanaTransaction: (
    options: AccountSignSolanaTransactionOptions,
  ) => Promise<SignSolanaTransactionResult>;

  // ─── Delegated Solana Send Methods ───

  /**
   * Sends a Solana transaction on behalf of this end user using a delegation.
   *
   * @param options - The send options.
   * @returns A promise that resolves to the transaction signature.
   */
  sendSolanaTransaction: (
    options: AccountSendSolanaTransactionOptions,
  ) => Promise<SendSolanaTransactionResult>;

  /**
   * Sends a Solana asset on behalf of this end user using a delegation.
   *
   * @param options - The send options.
   * @returns A promise that resolves to the transaction signature.
   */
  sendSolanaAsset: (options: AccountSendSolanaAssetOptions) => Promise<SendSolanaAssetResult>;
};

/**
 * An end user with actions that can be performed directly on the object.
 *
 * @see {@link OpenAPIEndUser}
 * @see {@link EndUserAccountActions}
 */
export type EndUserAccount = Prettify<OpenAPIEndUser & EndUserAccountActions>;
