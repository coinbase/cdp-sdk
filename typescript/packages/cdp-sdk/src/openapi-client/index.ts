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

import { configure, getAxiosInstance } from "./cdpApiClient.js";
import * as endUserAccountManagement from "./generated/end-user-account-management/end-user-account-management.js";
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
  ...endUserAccountManagement,
  configure,
  getAxiosInstance,
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
export * from "./generated/sql-api/sql-api.js";
export * from "./generated/accounts/accounts.js";
export * from "./generated/deposit-destinations/deposit-destinations.js";
export * from "./generated/transfers/transfers.js";
export * from "./generated/end-user-account-management/end-user-account-management.js";
export * from "./generated/payment-methods/payment-methods.js";
