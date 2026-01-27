export * from "./generated/coinbaseDeveloperPlatformAPIs.schemas.js";
export * from "./generated/evm-accounts/evm-accounts.js";
export * from "./generated/evm-smart-accounts/evm-smart-accounts.js";
export * from "./generated/evm-swaps/evm-swaps.js";
export * from "./generated/evm-token-balances/evm-token-balances.js";
export * from "./generated/solana-accounts/solana-accounts.js";
export * from "./generated/solana-token-balances/solana-token-balances.js";
export * from "./generated/faucets/faucets.js";
export * from "./generated/policy-engine/policy-engine.js";
export * from "./generated/onramp/onramp.js";
export * from "./generated/onchain-data/onchain-data.js";
export * from "./generated/end-user-accounts/end-user-accounts.js";
export * from "./generated/x402-facilitator/x402-facilitator.js";
export * from "./generated/sql-api-alpha/sql-api-alpha.js";

import { configure } from "./cdpApiClient.js";
import * as endUserAccounts from "./generated/end-user-accounts/end-user-accounts.js";
import * as evm from "./generated/evm-accounts/evm-accounts.js";
import * as evmSmartAccounts from "./generated/evm-smart-accounts/evm-smart-accounts.js";
import * as evmSwaps from "./generated/evm-swaps/evm-swaps.js";
import * as evmTokenBalances from "./generated/evm-token-balances/evm-token-balances.js";
import * as faucets from "./generated/faucets/faucets.js";
import * as onchainData from "./generated/onchain-data/onchain-data.js";
import * as policies from "./generated/policy-engine/policy-engine.js";
import * as solana from "./generated/solana-accounts/solana-accounts.js";
import * as solanaTokenBalances from "./generated/solana-token-balances/solana-token-balances.js";
import * as webhooks from "./generated/webhooks/webhooks.js";

export const CdpOpenApiClient = {
  ...evm,
  ...evmSmartAccounts,
  ...evmSwaps,
  ...evmTokenBalances,
  ...webhooks,
  ...solana,
  ...solanaTokenBalances,
  ...faucets,
  ...onchainData,
  ...policies,
  ...endUserAccounts,
  configure,
};

export const OpenApiEvmMethods = {
  ...evm,
  ...evmSmartAccounts,
  ...evmSwaps,
  ...evmTokenBalances,
  requestEvmFaucet: faucets.requestEvmFaucet,
};

export const OpenApiSolanaMethods = {
  ...solana,
  requestSolanaFaucet: faucets.requestSolanaFaucet,
};

export const OpenApiPoliciesMethods = {
  ...policies,
};

export type CdpOpenApiClientType = typeof CdpOpenApiClient;
export * from "./generated/accounts-under-development/accounts-under-development.js";
export * from "./generated/customers-under-development/customers-under-development.js";
export * from "./generated/deposit-destinations-under-development/deposit-destinations-under-development.js";
export * from "./generated/transfers-under-development/transfers-under-development.js";
export * from "./generated/entities-under-development/entities-under-development.js";
export * from "./generated/team-members-under-development/team-members-under-development.js";
export * from "./generated/reporting-under-development/reporting-under-development.js";
export * from "./generated/projects-under-development/projects-under-development.js";
export * from "./generated/embedded-wallets-under-development/embedded-wallets-under-development.js";
export * from "./generated/embedded-wallets-custom-auth/embedded-wallets-custom-auth.js";
export * from "./generated/embedded-wallets-custom-oauth/embedded-wallets-custom-oauth.js";
export * from "./generated/embedded-wallets-mfa/embedded-wallets-mfa.js";
export * from "./generated/permissions-under-development/permissions-under-development.js";
export * from "./generated/roles-under-development/roles-under-development.js";
export * from "./generated/wallet-secrets-internal/wallet-secrets-internal.js";
export * from "./generated/cors-internal/cors-internal.js";
export * from "./generated/payment-methods-under-development/payment-methods-under-development.js";
export * from "./generated/risk/risk.js";
