import { Account, SolanaAccount } from "./types.js";
import { requestFaucet } from "../../actions/solana/requestFaucet.js";
import { signMessage } from "../../actions/solana/signMessage.js";
import { signTransaction } from "../../actions/solana/signTransaction.js";
import {
  RequestFaucetOptions,
  SignatureResult,
  SignMessageOptions,
  SignTransactionOptions,
} from "../../client/solana/solana.types.js";
import { CdpOpenApiClientType } from "../../openapi-client/index.js";
/**
 * Options for converting a pre-existing EvmAccount to a EvmServerAccount.
 */
export type ToSolanaAccountOptions = {
  /** The Solana account that was previously created. */
  account: Account;
};

/**
 * Creates a Solana account instance with actions from an existing Solana account.
 * Use this to interact with previously deployed Solana accounts, rather than creating new ones.
 *
 * @param {CdpOpenApiClientType} apiClient - The API client.
 * @param {ToSolanaAccountOptions} options - Configuration options.
 * @param {Account} options.account - The Solana account that was previously created.
 * @returns {SolanaAccount} A configured SolanaAccount instance ready for signing.
 */
export function toSolanaAccount(
  apiClient: CdpOpenApiClientType,
  options: ToSolanaAccountOptions,
): SolanaAccount {
  const account: SolanaAccount = {
    address: options.account.address,
    name: options.account.name,
    async requestFaucet(options: Omit<RequestFaucetOptions, "address">): Promise<SignatureResult> {
      return requestFaucet(apiClient, {
        ...options,
        address: account.address,
      });
    },
    async signMessage(options: Omit<SignMessageOptions, "address">): Promise<SignatureResult> {
      return signMessage(apiClient, {
        ...options,
        address: account.address,
      });
    },
    async signTransaction(
      options: Omit<SignTransactionOptions, "address">,
    ): Promise<SignatureResult> {
      return signTransaction(apiClient, {
        ...options,
        address: account.address,
      });
    },
    policies: options.account.policies,
  };

  return account;
}
