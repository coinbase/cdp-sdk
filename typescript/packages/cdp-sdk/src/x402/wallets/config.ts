/**
 * Wallet configuration and resolution for CDP-backed x402 clients.
 */
export type WalletType = "cdp-eoa" | "cdp-smart";

/**
 * Wallet configuration for the CDP x402 client.
 *
 * All fields fall back to environment variables when omitted.
 * Explicit values always take precedence over env vars.
 */
export interface WalletConfig {
  /**
   * Which wallet backend to use. Falls back to CDP_WALLET_TYPE env var.
   * Defaults to "cdp-eoa".
   */
  type?: WalletType;
  /**
   * Named CDP account for "cdp-eoa" and "cdp-smart" types.
   * Falls back to CDP_ACCOUNT_NAME env var.
   * Defaults to "x402-server-wallet-1".
   */
  accountName?: string;
  /**
   * Owner EOA account name for "cdp-smart" type.
   * When set, the client provisions a Smart Contract Wallet owned by this EOA.
   * Falls back to CDP_OWNER_ACCOUNT_NAME env var.
   */
  ownerAccountName?: string;
}

/**
 * Resolved wallet configuration with all required fields for the selected type.
 */
export interface ResolvedWalletConfig {
  type: WalletType;
  accountName: string;
  ownerAccountName?: string;
}

const DEFAULT_ACCOUNT_NAME = "x402-server-wallet-1";
const SUPPORTED_WALLET_TYPES: WalletType[] = ["cdp-eoa", "cdp-smart"];

/**
 *
 * @param type
 */
export function resolveWalletType(type: string | undefined): WalletType {
  if (!type) return "cdp-eoa";
  if (SUPPORTED_WALLET_TYPES.includes(type as WalletType)) {
    return type as WalletType;
  }
  throw new Error(
    `Unsupported wallet type "${type}". Supported values: ${SUPPORTED_WALLET_TYPES.join(", ")}.`,
  );
}

/**
 * Resolves wallet configuration from explicit config and environment variables.
 * Explicit config always takes precedence over environment variables.
 *
 * @param config
 * @throws {Error} If required fields for the resolved wallet type are missing.
 */
export function resolveWalletConfig(config?: WalletConfig): ResolvedWalletConfig {
  const type = resolveWalletType(config?.type ?? process.env.CDP_WALLET_TYPE);

  const accountName = config?.accountName ?? process.env.CDP_ACCOUNT_NAME ?? DEFAULT_ACCOUNT_NAME;
  const ownerAccountName = config?.ownerAccountName ?? process.env.CDP_OWNER_ACCOUNT_NAME;

  if (type === "cdp-smart" && !ownerAccountName) {
    throw new Error(
      'Missing required owner account name for wallet type "cdp-smart". ' +
        "Provide it via walletConfig.ownerAccountName or set the CDP_OWNER_ACCOUNT_NAME environment variable.",
    );
  }

  return { type, accountName, ownerAccountName };
}
