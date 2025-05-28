export * from "./generated/coinbaseDeveloperPlatformAPIs.schemas.js";
export * from "./generated/evm-accounts/evm-accounts.js";
export * from "./generated/evm-smart-accounts/evm-smart-accounts.js";
export * from "./generated/evm-token-balances/evm-token-balances.js";
export * from "./generated/solana-accounts/solana-accounts.js";
export * from "./generated/faucets/faucets.js";
export * from "./generated/policy-engine/policy-engine.js";

import { configure } from "./cdpApiClient.js";
import * as evm from "./generated/evm-accounts/evm-accounts.js";
import * as evmSmartAccounts from "./generated/evm-smart-accounts/evm-smart-accounts.js";
import * as evmTokenBalances from "./generated/evm-token-balances/evm-token-balances.js";
import * as faucets from "./generated/faucets/faucets.js";
import * as policies from "./generated/policy-engine/policy-engine.js";
import * as solana from "./generated/solana-accounts/solana-accounts.js";

export const CdpOpenApiClient = {
  ...evm,
  ...evmSmartAccounts,
  ...evmTokenBalances,
  ...solana,
  ...faucets,
  ...policies,
  configure,
};

export const OpenApiEvmMethods = {
  ...evm,
  ...evmSmartAccounts,
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
