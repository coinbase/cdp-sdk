import { Analytics } from "../../analytics.js";
import { CdpOpenApiClient, type EndUser as OpenAPIEndUser } from "../../openapi-client/index.js";

import type {
  EndUserAccount,
  AddEndUserEvmAccountResult,
  AddEndUserEvmSmartAccountResult,
  AddEndUserSolanaAccountResult,
  AddEvmSmartAccountOptions,
} from "./endUser.types.js";

/**
 * Options for converting an OpenAPI EndUser to an EndUserAccount with actions.
 */
export type ToEndUserAccountOptions = {
  /** The end user from the API response. */
  endUser: OpenAPIEndUser;
};

/**
 * Creates an EndUserAccount instance with actions from an existing OpenAPI EndUser.
 * This wraps the raw API response and adds convenience methods for adding accounts.
 *
 * @param options - Configuration options.
 * @param options.endUser - The end user from the API response.
 * @returns An EndUserAccount instance with action methods.
 */
export function toEndUserAccount(options: ToEndUserAccountOptions): EndUserAccount {
  const endUserAccount: EndUserAccount = {
    // Pass through all properties from the OpenAPI EndUser
    userId: options.endUser.userId,
    authenticationMethods: options.endUser.authenticationMethods,
    mfaMethods: options.endUser.mfaMethods,
    evmAccounts: options.endUser.evmAccounts,
    evmAccountObjects: options.endUser.evmAccountObjects,
    evmSmartAccounts: options.endUser.evmSmartAccounts,
    evmSmartAccountObjects: options.endUser.evmSmartAccountObjects,
    solanaAccounts: options.endUser.solanaAccounts,
    solanaAccountObjects: options.endUser.solanaAccountObjects,
    createdAt: options.endUser.createdAt,

    // Add action methods
    async addEvmAccount(): Promise<AddEndUserEvmAccountResult> {
      Analytics.trackAction({
        action: "end_user_add_evm_account",
      });

      return CdpOpenApiClient.addEndUserEvmAccount(options.endUser.userId, {});
    },

    async addEvmSmartAccount(
      smartAccountOptions: AddEvmSmartAccountOptions,
    ): Promise<AddEndUserEvmSmartAccountResult> {
      Analytics.trackAction({
        action: "end_user_add_evm_smart_account",
      });

      return CdpOpenApiClient.addEndUserEvmSmartAccount(options.endUser.userId, {
        enableSpendPermissions: smartAccountOptions.enableSpendPermissions,
      });
    },

    async addSolanaAccount(): Promise<AddEndUserSolanaAccountResult> {
      Analytics.trackAction({
        action: "end_user_add_solana_account",
      });

      return CdpOpenApiClient.addEndUserSolanaAccount(options.endUser.userId, {});
    },
  };

  return endUserAccount;
}
