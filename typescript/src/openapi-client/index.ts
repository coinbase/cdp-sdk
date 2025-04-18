export * from "./generated/coinbaseDeveloperPlatformAPIs.schemas";
export * from "./generated/evm-accounts/evm-accounts";
export * from "./generated/evm-smart-accounts/evm-smart-accounts";
export * from "./generated/solana-accounts/solana-accounts";
export * from "./generated/faucets/faucets";

import { configure } from "./cdpApiClient";
import * as evm from "./generated/evm-accounts/evm-accounts";
import * as evmSmartAccounts from "./generated/evm-smart-accounts/evm-smart-accounts";
import * as faucets from "./generated/faucets/faucets";
import * as solana from "./generated/solana-accounts/solana-accounts";

export const CdpOpenApiClient = {
  ...evm,
  ...evmSmartAccounts,
  ...solana,
  ...faucets,
  configure,
};

export const OpenApiEvmMethods = {
  ...evm,
  ...evmSmartAccounts,
  requestEvmFaucet: faucets.requestEvmFaucet,
};

export const OpenApiSolanaMethods = {
  ...solana,
  requestSolanaFaucet: faucets.requestSolanaFaucet,
};

export type CdpOpenApiClientType = typeof CdpOpenApiClient;
