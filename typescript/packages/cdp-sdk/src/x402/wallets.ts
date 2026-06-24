/*
 * Wallet adapters and provisioning for the CDP x402 client.
 *
 * Bridges CDP SDK account types to x402-compatible signer interfaces,
 * and provisions EVM/Solana accounts from CDP credentials.
 */
import { address as toSolanaAddress, getTransactionEncoder } from "@solana/kit";
import { toClientEvmSigner } from "@x402/evm";

import { resolveCredentials } from "./credentials.js";
import { CdpClient } from "../client/cdp.js";

import type { CdpX402ClientConfig, ResolvedWalletConfig } from "./credentials.js";
import type { TransactionSigner } from "@solana/kit";
import type { ClientEvmSigner } from "@x402/evm";

// ─── EVM Server Account Adapter ───────────────────────────────────────────────

/**
 * Minimal interface for a CDP EVM account (EOA).
 * Matches the relevant methods from CdpClient's EvmServerAccount.
 */
export interface CdpEvmAccount {
  address: `0x${string}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signTypedData(params: any): Promise<`0x${string}`>;
}

/**
 * Converts a CDP EVM server account (EOA) into an x402-compatible signer.
 *
 * @param account - A CDP EVM account from `cdpClient.evm.getOrCreateAccount()`
 * @returns A `ClientEvmSigner` compatible with `@x402/evm`'s `registerExactEvmScheme`
 */
export function fromCdpEvmAccount(account: CdpEvmAccount): ClientEvmSigner {
  return toClientEvmSigner(account);
}

// ─── Smart Contract Wallet Adapter ────────────────────────────────────────────

/** Maps EIP-155 chain IDs to CDP SDK network names for SCW typed-data signing. */
const CHAIN_ID_TO_CDP_NETWORK: Record<number, string> = {
  8453: "base",
  84532: "base-sepolia",
  42161: "arbitrum",
  10: "optimism",
  7777777: "zora",
  137: "polygon",
  56: "bnb",
  43114: "avalanche",
  11155111: "ethereum-sepolia",
};

/**
 * Minimal interface for a CDP Smart Account (EvmSmartAccount).
 * Matches the relevant methods from CdpClient's EvmSmartAccount.
 */
export interface CdpSmartAccount {
  address: `0x${string}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signTypedData(options: Record<string, any>): Promise<`0x${string}`>;
}

/**
 * Resolves a CDP SDK network name from an EIP-712 domain chain ID.
 *
 * @param chainId - The EIP-712 domain chain ID to resolve.
 * @throws {Error} If the chain ID is undefined or not supported.
 * @returns The CDP SDK network name (e.g. `"base-sepolia"`).
 */
export function resolveNetworkFromChainId(chainId: number | undefined): string {
  if (chainId === undefined) {
    throw new Error(
      "Cannot derive CDP network: domain.chainId is missing from the typed data. " +
        "EIP-712 domain must include chainId when using a Smart Contract Wallet.",
    );
  }
  const network = CHAIN_ID_TO_CDP_NETWORK[chainId];
  if (!network) {
    throw new Error(
      `Unsupported chainId ${chainId} for CDP Smart Contract Wallet. ` +
        `Supported networks: ${Object.values(CHAIN_ID_TO_CDP_NETWORK).join(", ")}`,
    );
  }
  return network;
}

/**
 * Converts a CDP Smart Account (EvmSmartAccount) into an x402-compatible signer.
 *
 * CDP Smart Accounts differ from EOAs in that their `signTypedData` requires a
 * `network` parameter. This adapter derives the network automatically from the
 * EIP-712 domain's `chainId`.
 *
 * @param account - A CDP Smart Account from `cdpClient.evm.getOrCreateSmartAccount()`
 * @returns A `ClientEvmSigner` compatible with `@x402/evm`'s `registerExactEvmScheme`
 */
export function fromCdpSmartWallet(account: CdpSmartAccount): ClientEvmSigner {
  const signerShape = {
    address: account.address,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async signTypedData({ domain, types, primaryType, message }: any): Promise<`0x${string}`> {
      const chainId = domain?.chainId as number | undefined;
      const network = resolveNetworkFromChainId(chainId);
      return account.signTypedData({ domain, types, primaryType, message, network });
    },
  };
  return toClientEvmSigner(signerShape);
}

// ─── Solana Account Adapter ───────────────────────────────────────────────────

/**
 * Minimal interface for a CDP Solana account.
 * Matches the relevant methods from CdpClient's SolanaAccount.
 */
export interface CdpSolanaAccount {
  address: string;
  signTransaction(options: { transaction: string }): Promise<{ signedTransaction: string }>;
}

type ShortVecLength = {
  value: number;
  bytesRead: number;
};

/**
 * Decodes a Solana short-vector length prefix from the start of a byte array.
 *
 * @param bytes - Raw transaction bytes to decode.
 * @returns Decoded length value and number of bytes consumed.
 */
function decodeShortVecLength(bytes: Uint8Array): ShortVecLength {
  let value = 0;
  let shift = 0;
  let bytesRead = 0;
  while (bytesRead < bytes.length) {
    const byte = bytes[bytesRead]!;
    value |= (byte & 0x7f) << shift;
    bytesRead += 1;
    if ((byte & 0x80) === 0) {
      return { value, bytesRead };
    }
    shift += 7;
  }
  throw new Error("Invalid Solana transaction wire format: truncated shortvec length.");
}

/**
 * Finds the index of a signer in a compiled Solana transaction's signatures map.
 *
 * @param transaction - Compiled Solana transaction object.
 * @param signerAddress - Base58 signer address to locate.
 * @returns The zero-based index of the signer in the signatures array.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveSignerIndex(transaction: any, signerAddress: string): number {
  const signatures = transaction?.signatures;
  if (signatures && typeof signatures === "object") {
    const signerOrder = Object.keys(signatures);
    const index = signerOrder.indexOf(signerAddress);
    if (index >= 0) return index;
  }
  throw new Error(
    `Unable to locate signer "${signerAddress}" in transaction signatures. ` +
      "Expected transaction.signatures to contain the signer address.",
  );
}

/**
 * Converts a CDP Solana account into an x402-compatible `TransactionSigner`.
 *
 * Handles the translation between CDP's base64-encoded transaction strings and
 * `@solana/kit`'s compiled transaction objects.
 *
 * @param account - A CDP Solana account from `cdpClient.solana.getOrCreateAccount()`
 * @returns A `TransactionSigner` compatible with `@x402/svm`'s `registerExactSvmScheme`
 */
export function cdpSolanaAccountToSvmSigner(account: CdpSolanaAccount): TransactionSigner {
  const signerAddress = toSolanaAddress(account.address);
  const signerAddressKey = signerAddress as string;
  const encoder = getTransactionEncoder();

  return {
    address: signerAddress,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async signTransactions(transactions: readonly any[]): Promise<readonly any[]> {
      const results = [];
      for (const transaction of transactions) {
        const signerIndex = resolveSignerIndex(transaction, signerAddressKey);
        const encodedBytes = encoder.encode(transaction);
        const base64Transaction = Buffer.from(encodedBytes).toString("base64");
        const { signedTransaction } = await account.signTransaction({
          transaction: base64Transaction,
        });
        const signedBytes = Buffer.from(signedTransaction, "base64");
        const { value: signatureCount, bytesRead: signatureSectionOffset } =
          decodeShortVecLength(signedBytes);
        if (signerIndex >= signatureCount) {
          throw new Error(
            `Signer index ${signerIndex} is out of bounds for ${signatureCount} signatures.`,
          );
        }
        const signatureOffset = signatureSectionOffset + signerIndex * 64;
        const signatureEnd = signatureOffset + 64;
        if (signatureEnd > signedBytes.length) {
          throw new Error(
            "Invalid Solana transaction wire format: signed transaction is missing signature bytes.",
          );
        }
        const signature = new Uint8Array(signedBytes.slice(signatureOffset, signatureEnd));
        results.push({ [signerAddressKey]: signature });
      }
      return results;
    },
  } as TransactionSigner;
}

// ─── Provisioning ─────────────────────────────────────────────────────────────

/**
 * The result of provisioning CDP accounts for use with x402.
 */
export interface CdpAccountProvisionResult {
  /** The underlying CdpClient instance. */
  cdpClient: CdpClient;
  /** EVM address for the provisioned account (EOA or SCW per walletConfig). */
  evmAddress: `0x${string}`;
  /** Solana account address. */
  svmAddress: string;
  /**
   * Owner account name. Only set when `walletConfig.type` is `"smart"`.
   * The owner signs EIP-712 typed data on behalf of the smart account.
   */
  ownerWallet?: string;
  /** x402-compatible EVM signer. */
  evmSigner: ClientEvmSigner;
  /** x402-compatible Solana transaction signer. */
  svmSigner: TransactionSigner;
}

/**
 * Returns true when the CDP API rejected smart account creation because the owner
 * already has a smart account registered under a different name.
 *
 * @param error - Error thrown by `getOrCreateSmartAccount`.
 * @returns `true` if the error indicates the owner already has a smart account.
 */
export function isOwnerAlreadyHasSmartWalletError(error: unknown): boolean {
  return (
    error instanceof Error && error.message.includes("Multiple smart wallets with the same owner")
  );
}

/**
 * Finds an existing smart account by owner address, paging through all results.
 *
 * Used as a recovery when `getOrCreateSmartAccount` fails because the owner
 * already owns a smart account under a different name.
 *
 * @param cdpClient - Configured CDP client to query.
 * @param ownerAddress - The owner EOA address to match (case-insensitive).
 * @returns The first matching smart account address, or `undefined` if none found.
 */
export async function findSmartAccountByOwner(
  cdpClient: CdpClient,
  ownerAddress: string,
): Promise<string | undefined> {
  const normalizedOwner = ownerAddress.toLowerCase();
  let pageToken: string | undefined;
  do {
    const result = await cdpClient.evm.listSmartAccounts({ pageToken });
    const match = result.accounts.find(a => a.owners[0]?.toLowerCase() === normalizedOwner);
    if (match) return match.address;
    pageToken = result.nextPageToken;
  } while (pageToken);
  return undefined;
}

/**
 * Provisions CDP EVM and Solana accounts and builds x402-compatible signers.
 *
 * Used by `CdpX402Client` to resolve wallet addresses and register payment
 * schemes on first use.
 *
 * @param config - Optional credential config. All fields fall back to env vars.
 * @param walletConfig - Resolved wallet type and account names.
 * @returns Provisioned accounts, addresses, and x402-compatible signers.
 */
export async function provisionCdpAccounts(
  config: CdpX402ClientConfig | undefined,
  walletConfig: ResolvedWalletConfig,
): Promise<CdpAccountProvisionResult> {
  const credentials = resolveCredentials(config);
  const cdpClient = new CdpClient({
    apiKeyId: credentials.apiKeyId,
    apiKeySecret: credentials.apiKeySecret,
    walletSecret: credentials.walletSecret,
  });

  const svmAccount = await cdpClient.solana.getOrCreateAccount({
    name: walletConfig.accountName,
  });

  let evmAddress: `0x${string}`;
  let ownerWallet: string | undefined;
  let evmSigner: ClientEvmSigner;

  if (walletConfig.type === "smart") {
    const ownerAccount = await cdpClient.evm.getOrCreateAccount({
      name: walletConfig.ownerAccountName!,
    });

    let smartAccount;
    try {
      smartAccount = await cdpClient.evm.getOrCreateSmartAccount({
        name: walletConfig.accountName,
        owner: ownerAccount,
      });
    } catch (error) {
      /*
       * CDP allows only one smart wallet per owner. If the owner already has a
       * smart wallet registered under a different name, recover by finding it.
       */
      if (isOwnerAlreadyHasSmartWalletError(error)) {
        const existingAddress = await findSmartAccountByOwner(cdpClient, ownerAccount.address);
        if (!existingAddress) throw error;
        smartAccount = await cdpClient.evm.getSmartAccount({
          address: existingAddress as `0x${string}`,
          owner: ownerAccount,
        });
      } else {
        throw error;
      }
    }

    evmAddress = smartAccount.address as `0x${string}`;
    ownerWallet = walletConfig.ownerAccountName!;
    evmSigner = fromCdpSmartWallet(smartAccount);
  } else {
    const evmAccount = await cdpClient.evm.getOrCreateAccount({
      name: walletConfig.accountName,
    });
    evmAddress = evmAccount.address as `0x${string}`;
    evmSigner = fromCdpEvmAccount(evmAccount);
  }

  return {
    cdpClient,
    evmAddress,
    svmAddress: svmAccount.address,
    ownerWallet,
    evmSigner,
    svmSigner: cdpSolanaAccountToSvmSigner(svmAccount),
  };
}
