import { smartAccountTransferStrategy } from "../../actions/evm/transfer/smartAccountTransferStrategy.js";
import { transfer } from "../../actions/evm/transfer/transfer.js";

import type { TransferResult } from "../../actions/evm/transfer/types.js";
import type {
  CdpOpenApiClientType,
  EvmSmartAccount as EvmSmartAccountModel,
} from "../../openapi-client/index.js";
import type { Address } from "../../types/misc.js";
import type { EvmAccount, EvmSmartAccount } from "../types.js";

/**
 * Options for converting a pre-existing EvmSmartAccount and owner to a EvmSmartAccount
 */
export type ToEvmSmartAccountOptions = {
  /** The pre-existing EvmSmartAccount. */
  smartAccount: EvmSmartAccountModel;
  /** The owner of the smart account. */
  owner: EvmAccount;
};

/**
 * Creates a EvmSmartAccount instance from an existing EvmSmartAccount and owner.
 * Use this to interact with previously deployed EvmSmartAccounts, rather than creating new ones.
 *
 * The owner must be the original owner of the evm smart account.
 *
 * @param {CdpOpenApiClientType} apiClient - The API client.
 * @param {ToEvmSmartAccountOptions} options - Configuration options.
 * @param {EvmSmartAccount} options.smartAccount - The deployed evm smart account.
 * @param {EvmAccount} options.owner - The owner which signs for the smart account.
 * @returns {EvmSmartAccount} A configured EvmSmartAccount instance ready for user operation submission.
 * @throws {Error} If the account is not an original owner of the smart account.
 */
export function toEvmSmartAccount(
  apiClient: CdpOpenApiClientType,
  options: ToEvmSmartAccountOptions,
): EvmSmartAccount {
  const account: EvmSmartAccount = {
    address: options.smartAccount.address as Address,
    owners: [options.owner],
    async transfer(transferArgs): Promise<TransferResult> {
      return transfer(apiClient, account, transferArgs, smartAccountTransferStrategy);
    },
    name: options.smartAccount.name,
    type: "evm-smart",
  };

  return account;
}
