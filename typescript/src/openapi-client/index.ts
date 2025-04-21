export * from "./generated/coinbaseDeveloperPlatformAPIs.schemas";
export * from "./generated/evm-accounts/evm-accounts";
export * from "./generated/evm-smart-accounts/evm-smart-accounts";
export * from "./generated/solana-accounts/solana-accounts";
export * from "./generated/faucets/faucets";

import * as evm from "./generated/evm-accounts/evm-accounts";
import * as evmSmartAccounts from "./generated/evm-smart-accounts/evm-smart-accounts";
import * as evmTokenBalances from "./generated/evm-token-balances/evm-token-balances";
import * as solana from "./generated/solana-accounts/solana-accounts";
import * as faucets from "./generated/faucets/faucets";
import { configure } from "./cdpApiClient";

export const CdpOpenApiClient = {
  ...evm,
  ...evmSmartAccounts,
  ...evmTokenBalances,
  ...solana,
  ...faucets,
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

export type CdpOpenApiClientType = typeof CdpOpenApiClient;
