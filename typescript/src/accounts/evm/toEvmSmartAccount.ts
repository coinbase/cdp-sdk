import { getUserOperation } from "../../actions/evm/getUserOperation.js";
import {
  listTokenBalances,
  type ListTokenBalancesOptions,
  type ListTokenBalancesResult,
} from "../../actions/evm/listTokenBalances.js";
import {
  RequestFaucetResult,
  RequestFaucetOptions,
  requestFaucet,
} from "../../actions/evm/requestFaucet.js";
import {
  type SendUserOperationOptions,
  type SendUserOperationReturnType,
  sendUserOperation,
} from "../../actions/evm/sendUserOperation.js";
import { smartAccountTransferStrategy } from "../../actions/evm/transfer/smartAccountTransferStrategy.js";
import { transfer } from "../../actions/evm/transfer/transfer.js";
import {
  waitForUserOperation,
  WaitForUserOperationOptions,
  WaitForUserOperationReturnType,
} from "../../actions/evm/waitForUserOperation.js";
import { GetUserOperationOptions, UserOperation } from "../../client/evm/evm.types.js";

import type { EvmAccount, EvmSmartAccount } from "./types.js";
import type { TransferResult } from "../../actions/evm/transfer/types.js";
import type {
  CdpOpenApiClientType,
  EvmSmartAccount as EvmSmartAccountModel,
} from "../../openapi-client/index.js";
import type { Address } from "../../types/misc.js";

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
    async listTokenBalances(
      options: Omit<ListTokenBalancesOptions, "address">,
    ): Promise<ListTokenBalancesResult> {
      return listTokenBalances(apiClient, {
        ...options,
        address: this.address,
      });
    },
    async sendUserOperation(
      options: Omit<SendUserOperationOptions<unknown[]>, "smartAccount">,
    ): Promise<SendUserOperationReturnType> {
      return sendUserOperation(apiClient, {
        ...options,
        smartAccount: account,
      });
    },
    async waitForUserOperation(
      options: Omit<WaitForUserOperationOptions, "smartAccountAddress">,
    ): Promise<WaitForUserOperationReturnType> {
      return waitForUserOperation(apiClient, {
        ...options,
        smartAccountAddress: account.address,
      });
    },
    async getUserOperation(
      options: Omit<GetUserOperationOptions, "smartAccount">,
    ): Promise<UserOperation> {
      return getUserOperation(apiClient, {
        ...options,
        smartAccount: account,
      });
    },
    async requestFaucet(
      options: Omit<RequestFaucetOptions, "address">,
    ): Promise<RequestFaucetResult> {
      return requestFaucet(apiClient, {
        ...options,
        address: account.address,
      });
    },
    name: options.smartAccount.name,
    type: "evm-smart",
  };

  return account;
}
