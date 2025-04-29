import { type Hex, type TransactionSerializable, serializeTransaction } from "viem";

import { accountTransferStrategy } from "../../actions/evm/transfer/accountTransferStrategy.js";
import { transfer } from "../../actions/evm/transfer/transfer.js";

import type { TransferResult } from "../../actions/evm/transfer/types.js";
import type { CdpOpenApiClientType, EvmAccount } from "../../openapi-client/index.js";
import type { Address, Hash } from "../../types/misc.js";
import type { EvmServerAccount } from "../types.js";

/**
 * Options for converting a pre-existing EvmAccount to a EvmServerAccount.
 */
export type ToEvmServerAccountOptions = {
  /** The EvmAccount that was previously created. */
  account: EvmAccount;
};

/**
 * Creates a Server-managed EvmAccount instance from an existing EvmAccount.
 * Use this to interact with previously deployed EvmAccounts, rather than creating new ones.
 *
 * @param {CdpOpenApiClientType} apiClient - The API client.
 * @param {ToEvmServerAccountOptions} options - Configuration options.
 * @param {EvmAccount} options.account - The EvmAccount that was previously created.
 * @returns {EvmServerAccount} A configured EvmAccount instance ready for signing.
 */
export function toEvmServerAccount(
  apiClient: CdpOpenApiClientType,
  options: ToEvmServerAccountOptions,
): EvmServerAccount {
  const account: EvmServerAccount = {
    address: options.account.address as Address,
    async signMessage({ message }) {
      const result = await apiClient.signEvmMessage(options.account.address, {
        message: message.toString(),
      });
      return result.signature as Hex;
    },

    async sign(parameters: { hash: Hash }) {
      const result = await apiClient.signEvmHash(options.account.address, {
        hash: parameters.hash,
      });
      return result.signature as Hex;
    },

    async signTransaction(transaction: TransactionSerializable) {
      const result = await apiClient.signEvmTransaction(options.account.address, {
        transaction: serializeTransaction(transaction),
      });
      return result.signedTransaction as Hex;
    },

    async signTypedData() {
      throw new Error("Not implemented");
    },
    async transfer(transferArgs): Promise<TransferResult> {
      return transfer(apiClient, account, transferArgs, accountTransferStrategy);
    },
    name: options.account.name,
    type: "evm-server",
  };

  return account;
}
