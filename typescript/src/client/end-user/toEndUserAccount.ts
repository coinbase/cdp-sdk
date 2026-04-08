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
  const { endUser } = options;

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

    await apiClient.revokeDelegationForEndUserDelegation(endUser.userId, {});
    },

    // ─── Delegated EVM Sign Methods ───

    async signEvmHash(opts: AccountSignEvmHashOptions): Promise<SignEvmHashResult> {
      return apiClient.signEvmHashWithEndUserAccountDelegation(endUser.userId, {
        hash: opts.hash,
        address,
      });
    },

    async signEvmTransaction(
      opts: AccountSignEvmTransactionOptions,
    ): Promise<SignEvmTransactionResult> {
    return apiClient.signEvmTransactionWithEndUserAccountDelegation(endUser.userId, {
        address,
        transaction: opts.transaction,
      });
    },

    async signEvmMessage(opts: AccountSignEvmMessageOptions): Promise<SignEvmMessageResult> {
      Analytics.trackAction({ action: "end_user_sign_evm_message" });
      const address = resolveEvmAddress(endUser, opts.address);
      return apiClient.signEvmMessageWithEndUserAccountDelegation(endUser.userId, {
        address,
        message: opts.message,
      });
    },

    async signEvmTypedData(opts: AccountSignEvmTypedDataOptions): Promise<SignEvmTypedDataResult> {
      Analytics.trackAction({ action: "end_user_sign_evm_typed_data" });
      const address = resolveEvmAddress(endUser, opts.address);
      return apiClient.signEvmTypedDataWithEndUserAccountDelegation(endUser.userId, {
        address,
        typedData: opts.typedData,
      });
    },

    // ─── Delegated EVM Send Methods ───

    async sendEvmTransaction(
      opts: AccountSendEvmTransactionOptions,
    ): Promise<SendEvmTransactionResult> {
      return apiClient.sendEvmTransactionWithEndUserAccountDelegation(endUser.userId, {
        address,
        transaction: opts.transaction,
        network: opts.network,
      });
    },

    async sendEvmAsset(opts: AccountSendEvmAssetOptions): Promise<SendEvmAssetResult> {
      Analytics.trackAction({ action: "end_user_send_evm_asset" });
      return apiClient.sendEvmAssetWithEndUserAccountDelegation(endUser.userId, address, asset, {
        to: opts.to,
        amount: opts.amount,
        network: opts.network,
        useCdpPaymaster: opts.useCdpPaymaster,
        paymasterUrl: opts.paymasterUrl,
      });
    },

    async sendUserOperation(
      opts: AccountSendUserOperationOptions,
    ): Promise<SendUserOperationResult> {
      return apiClient.sendUserOperationWithEndUserAccountDelegation(endUser.userId, address, {
        network: opts.network,
        calls: opts.calls,
        useCdpPaymaster: opts.useCdpPaymaster,
        paymasterUrl: opts.paymasterUrl,
        dataSuffix: opts.dataSuffix,
      });
    },

    // ─── Delegated EVM EIP-7702 Delegation Method ───

    async createEvmEip7702Delegation(
      opts: AccountCreateEvmEip7702DelegationOptions,
    ): Promise<CreateEvmEip7702DelegationForEndUserResult> {
      return apiClient.createEvmEip7702DelegationWithEndUserAccountDelegation(endUser.userId, {
        address,
        network: opts.network,
        enableSpendPermissions: opts.enableSpendPermissions,
      });
    },

    // ─── Delegated Solana Sign Methods ───

    async signSolanaHash(opts: AccountSignSolanaHashOptions): Promise<SignSolanaHashResult> {
      return apiClient.signSolanaHashWithEndUserAccountDelegation(endUser.userId, {
        hash: opts.hash,
        address,
      });
    },

    async signSolanaMessage(
      opts: AccountSignSolanaMessageOptions,
    ): Promise<SignSolanaMessageResult> {
      return apiClient.signSolanaMessageWithEndUserAccountDelegation(endUser.userId, {
        address,
        message: opts.message,
      });
    },

    async signSolanaTransaction(
      opts: AccountSignSolanaTransactionOptions,
    ): Promise<SignSolanaTransactionResult> {
      return apiClient.signSolanaTransactionWithEndUserAccountDelegation(endUser.userId, {
        address,
        transaction: opts.transaction,
      });
    },

    // ─── Delegated Solana Send Methods ───

    async sendSolanaTransaction(
      opts: AccountSendSolanaTransactionOptions,
    ): Promise<SendSolanaTransactionResult> {
      return apiClient.sendSolanaTransactionWithEndUserAccountDelegation(endUser.userId, {
        address,
        transaction: opts.transaction,
        network: opts.network,
      });
    },

    async sendSolanaAsset(opts: AccountSendSolanaAssetOptions): Promise<SendSolanaAssetResult> {
      Analytics.trackAction({ action: "end_user_send_solana_asset" });
      return apiClient.sendSolanaAssetWithEndUserAccountDelegation(endUser.userId, address, asset, {
        to: opts.to,
        amount: opts.amount,
        network: opts.network,
        createRecipientAta: opts.createRecipientAta,
      });
    },
  };

  return endUserAccount;
}
