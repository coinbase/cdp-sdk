import { Analytics } from "../../analytics.js";

import type {
  EndUserAccount,
  AddEndUserEvmAccountResult,
  AddEndUserEvmSmartAccountResult,
  AddEndUserSolanaAccountResult,
  AddEvmSmartAccountOptions,
  SignEvmHashResult,
  SignEvmTransactionResult,
  SignEvmMessageResult,
  SignEvmTypedDataResult,
  SendEvmTransactionResult,
  SendEvmAssetResult,
  SendUserOperationResult,
  CreateEvmEip7702DelegationForEndUserResult,
  SignSolanaHashResult,
  SignSolanaMessageResult,
  SignSolanaTransactionResult,
  SendSolanaTransactionResult,
  SendSolanaAssetResult,
  AccountSignEvmHashOptions,
  AccountSignEvmTransactionOptions,
  AccountSignEvmMessageOptions,
  AccountSignEvmTypedDataOptions,
  AccountSendEvmTransactionOptions,
  AccountSendEvmAssetOptions,
  AccountSendUserOperationOptions,
  AccountCreateEvmEip7702DelegationOptions,
  AccountSignSolanaHashOptions,
  AccountSignSolanaMessageOptions,
  AccountSignSolanaTransactionOptions,
  AccountSendSolanaTransactionOptions,
  AccountSendSolanaAssetOptions,
} from "./endUser.types.js";
import type {
  CdpOpenApiClientType,
  EndUser as OpenAPIEndUser,
} from "../../openapi-client/index.js";

/**
 * Options for converting an OpenAPI EndUser to an EndUserAccount with actions.
 */
export type ToEndUserAccountOptions = {
  /** The end user from the API response. */
  endUser: OpenAPIEndUser;
  /** The CDP project ID. Required for delegation operations (signing, sending). */
  projectId?: string;
};

/**
 * Returns the project ID or throws if not configured.
 * Used by delegation operations that require a project ID.
 *
 * @param projectId - The project ID to validate.
 * @returns The validated project ID.
 */
function requireProjectId(projectId: string | undefined): string {
  if (!projectId) {
    throw new Error(
      "Missing required project ID for delegation operation. " +
        "Set the CDP_PROJECT_ID environment variable or pass projectId to the CdpClient constructor.",
    );
  }

  return projectId;
}

/**
 * Resolves the first EVM EOA address for this end user, or throws if none exist and no override was provided.
 *
 * @param endUser - The OpenAPI end user.
 * @param override - An optional address override.
 * @returns The resolved EVM address.
 */
function resolveEvmAddress(endUser: OpenAPIEndUser, override?: string): string {
  const address = override ?? endUser.evmAccountObjects[0]?.address;
  if (!address) {
    throw new Error(
      "No EVM account found on this end user. Provide an explicit address or add an EVM account first.",
    );
  }
  return address;
}

/**
 * Resolves the first EVM smart account address for this end user, or throws if none exist and no override was provided.
 *
 * @param endUser - The OpenAPI end user.
 * @param override - An optional address override.
 * @returns The resolved EVM smart account address.
 */
function resolveEvmSmartAccountAddress(endUser: OpenAPIEndUser, override?: string): string {
  const address = override ?? endUser.evmSmartAccountObjects[0]?.address;
  if (!address) {
    throw new Error(
      "No EVM smart account found on this end user. Provide an explicit address or add an EVM smart account first.",
    );
  }
  return address;
}

/**
 * Resolves the first Solana address for this end user, or throws if none exist and no override was provided.
 *
 * @param endUser - The OpenAPI end user.
 * @param override - An optional address override.
 * @returns The resolved Solana address.
 */
function resolveSolanaAddress(endUser: OpenAPIEndUser, override?: string): string {
  const address = override ?? endUser.solanaAccountObjects[0]?.address;
  if (!address) {
    throw new Error(
      "No Solana account found on this end user. Provide an explicit address or add a Solana account first.",
    );
  }
  return address;
}

/**
 * Creates an EndUserAccount instance with actions from an existing OpenAPI EndUser.
 * This wraps the raw API response and adds convenience methods for adding accounts
 * and performing delegated signing/sending operations.
 *
 * @param apiClient - The API client.
 * @param options - Configuration options.
 * @param options.endUser - The end user from the API response.
 * @returns An EndUserAccount instance with action methods.
 */
export function toEndUserAccount(
  apiClient: CdpOpenApiClientType,
  options: ToEndUserAccountOptions,
): EndUserAccount {
  const { endUser, projectId } = options;

  const endUserAccount: EndUserAccount = {
    // Pass through all properties from the OpenAPI EndUser
    userId: endUser.userId,
    authenticationMethods: endUser.authenticationMethods,
    mfaMethods: endUser.mfaMethods,
    evmAccounts: endUser.evmAccounts,
    evmAccountObjects: endUser.evmAccountObjects,
    evmSmartAccounts: endUser.evmSmartAccounts,
    evmSmartAccountObjects: endUser.evmSmartAccountObjects,
    solanaAccounts: endUser.solanaAccounts,
    solanaAccountObjects: endUser.solanaAccountObjects,
    createdAt: endUser.createdAt,

    // ─── Account Management Methods ───

    async addEvmAccount(): Promise<AddEndUserEvmAccountResult> {
      Analytics.trackAction({ action: "end_user_add_evm_account" });
      return apiClient.addEndUserEvmAccount(endUser.userId, {});
    },

    async addEvmSmartAccount(
      smartAccountOptions: AddEvmSmartAccountOptions,
    ): Promise<AddEndUserEvmSmartAccountResult> {
      Analytics.trackAction({ action: "end_user_add_evm_smart_account" });
      return apiClient.addEndUserEvmSmartAccount(endUser.userId, {
        enableSpendPermissions: smartAccountOptions.enableSpendPermissions,
      });
    },

    async addSolanaAccount(): Promise<AddEndUserSolanaAccountResult> {
      Analytics.trackAction({ action: "end_user_add_solana_account" });
      return apiClient.addEndUserSolanaAccount(endUser.userId, {});
    },

    async revokeDelegation(): Promise<void> {
      Analytics.trackAction({ action: "end_user_revoke_delegation" });
      await apiClient.revokeDelegationForEndUser(requireProjectId(projectId), endUser.userId, {});
    },

    // ─── Delegated EVM Sign Methods ───

    async signEvmHash(opts: AccountSignEvmHashOptions): Promise<SignEvmHashResult> {
      Analytics.trackAction({ action: "end_user_sign_evm_hash" });
      const address = resolveEvmAddress(endUser, opts.address);
      return apiClient.signEvmHashWithEndUserAccount(requireProjectId(projectId), endUser.userId, {
        hash: opts.hash,
        address,
      });
    },

    async signEvmTransaction(
      opts: AccountSignEvmTransactionOptions,
    ): Promise<SignEvmTransactionResult> {
      Analytics.trackAction({ action: "end_user_sign_evm_transaction" });
      const address = resolveEvmAddress(endUser, opts.address);
      return apiClient.signEvmTransactionWithEndUserAccount(
        requireProjectId(projectId),
        endUser.userId,
        {
          address,
          transaction: opts.transaction,
        },
      );
    },

    async signEvmMessage(opts: AccountSignEvmMessageOptions): Promise<SignEvmMessageResult> {
      Analytics.trackAction({ action: "end_user_sign_evm_message" });
      const address = resolveEvmAddress(endUser, opts.address);
      return apiClient.signEvmMessageWithEndUserAccount(
        requireProjectId(projectId),
        endUser.userId,
        {
          address,
          message: opts.message,
        },
      );
    },

    async signEvmTypedData(opts: AccountSignEvmTypedDataOptions): Promise<SignEvmTypedDataResult> {
      Analytics.trackAction({ action: "end_user_sign_evm_typed_data" });
      const address = resolveEvmAddress(endUser, opts.address);
      return apiClient.signEvmTypedDataWithEndUserAccount(
        requireProjectId(projectId),
        endUser.userId,
        {
          address,
          typedData: opts.typedData,
        },
      );
    },

    // ─── Delegated EVM Send Methods ───

    async sendEvmTransaction(
      opts: AccountSendEvmTransactionOptions,
    ): Promise<SendEvmTransactionResult> {
      Analytics.trackAction({ action: "end_user_send_evm_transaction" });
      const address = resolveEvmAddress(endUser, opts.address);
      return apiClient.sendEvmTransactionWithEndUserAccount(
        requireProjectId(projectId),
        endUser.userId,
        {
          address,
          transaction: opts.transaction,
          network: opts.network,
        },
      );
    },

    async sendEvmAsset(opts: AccountSendEvmAssetOptions): Promise<SendEvmAssetResult> {
      Analytics.trackAction({ action: "end_user_send_evm_asset" });
      const address = resolveEvmAddress(endUser, opts.address);
      const asset = opts.asset ?? "usdc";
      return apiClient.sendEvmAssetWithEndUserAccount(
        requireProjectId(projectId),
        endUser.userId,
        address,
        asset,
        {
          to: opts.to,
          amount: opts.amount,
          network: opts.network,
          useCdpPaymaster: opts.useCdpPaymaster,
          paymasterUrl: opts.paymasterUrl,
        },
      );
    },

    async sendUserOperation(
      opts: AccountSendUserOperationOptions,
    ): Promise<SendUserOperationResult> {
      Analytics.trackAction({ action: "end_user_send_user_operation" });
      const address = resolveEvmSmartAccountAddress(endUser, opts.address);
      return apiClient.sendUserOperationWithEndUserAccount(
        requireProjectId(projectId),
        endUser.userId,
        address,
        {
          network: opts.network,
          calls: opts.calls,
          useCdpPaymaster: opts.useCdpPaymaster,
          paymasterUrl: opts.paymasterUrl,
          dataSuffix: opts.dataSuffix,
        },
      );
    },

    // ─── Delegated EVM EIP-7702 Delegation Method ───

    async createEvmEip7702Delegation(
      opts: AccountCreateEvmEip7702DelegationOptions,
    ): Promise<CreateEvmEip7702DelegationForEndUserResult> {
      Analytics.trackAction({ action: "end_user_create_evm_eip7702_delegation" });
      const address = resolveEvmAddress(endUser, opts.address);
      return apiClient.createEvmEip7702DelegationWithEndUserAccount(
        requireProjectId(projectId),
        endUser.userId,
        {
          address,
          network: opts.network,
          enableSpendPermissions: opts.enableSpendPermissions,
        },
      );
    },

    // ─── Delegated Solana Sign Methods ───

    async signSolanaHash(opts: AccountSignSolanaHashOptions): Promise<SignSolanaHashResult> {
      Analytics.trackAction({ action: "end_user_sign_solana_hash" });
      const address = resolveSolanaAddress(endUser, opts.address);
      return apiClient.signSolanaHashWithEndUserAccount(
        requireProjectId(projectId),
        endUser.userId,
        {
          hash: opts.hash,
          address,
        },
      );
    },

    async signSolanaMessage(
      opts: AccountSignSolanaMessageOptions,
    ): Promise<SignSolanaMessageResult> {
      Analytics.trackAction({ action: "end_user_sign_solana_message" });
      const address = resolveSolanaAddress(endUser, opts.address);
      return apiClient.signSolanaMessageWithEndUserAccount(
        requireProjectId(projectId),
        endUser.userId,
        {
          address,
          message: opts.message,
        },
      );
    },

    async signSolanaTransaction(
      opts: AccountSignSolanaTransactionOptions,
    ): Promise<SignSolanaTransactionResult> {
      Analytics.trackAction({ action: "end_user_sign_solana_transaction" });
      const address = resolveSolanaAddress(endUser, opts.address);
      return apiClient.signSolanaTransactionWithEndUserAccount(
        requireProjectId(projectId),
        endUser.userId,
        {
          address,
          transaction: opts.transaction,
        },
      );
    },

    // ─── Delegated Solana Send Methods ───

    async sendSolanaTransaction(
      opts: AccountSendSolanaTransactionOptions,
    ): Promise<SendSolanaTransactionResult> {
      Analytics.trackAction({ action: "end_user_send_solana_transaction" });
      const address = resolveSolanaAddress(endUser, opts.address);
      return apiClient.sendSolanaTransactionWithEndUserAccount(
        requireProjectId(projectId),
        endUser.userId,
        {
          address,
          transaction: opts.transaction,
          network: opts.network,
        },
      );
    },

    async sendSolanaAsset(opts: AccountSendSolanaAssetOptions): Promise<SendSolanaAssetResult> {
      Analytics.trackAction({ action: "end_user_send_solana_asset" });
      const address = resolveSolanaAddress(endUser, opts.address);
      const asset = opts.asset ?? "usdc";
      return apiClient.sendSolanaAssetWithEndUserAccount(
        requireProjectId(projectId),
        endUser.userId,
        address,
        asset,
        {
          to: opts.to,
          amount: opts.amount,
          network: opts.network,
          createRecipientAta: opts.createRecipientAta,
        },
      );
    },
  };

  return endUserAccount;
}
