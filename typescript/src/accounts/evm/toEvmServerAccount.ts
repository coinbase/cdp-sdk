import { EvmServerAccount } from "../types";
import type { Address, Hash } from "../../types/misc";
import { serializeTransaction, Transaction } from "viem";
import { CdpOpenApiClientType, EvmAccount } from "../../openapi-client";

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
      return result.signature as `0x${string}`;
    },

    async sign(parameters: { hash: Hash }) {
      const result = await apiClient.signEvmHash(options.account.address, {
        hash: parameters.hash,
      });
      return result.signature as `0x${string}`;
    },

    async signTransaction(transaction: Transaction) {
      const result = await apiClient.signEvmTransaction(options.account.address, {
        transaction: serializeTransaction(transaction),
      });
      return result.signedTransaction as `0x${string}`;
    },

    async signTypedData() {
      throw new Error("Not implemented");
    },
    name: options.account.name,
    type: "evm-server",
  };

  return account;
}
