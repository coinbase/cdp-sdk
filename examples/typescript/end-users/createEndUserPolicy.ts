// Usage: pnpm tsx end-users/createEndUserPolicy.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

const cdp = new CdpClient();

const policy = await cdp.policies.createPolicy({
  policy: {
    description: "End User Policy Example",
    scope: 'project',
    rules: [
      // Restrict end-user EVM transaction signing to a max value and allowlisted recipients
      {
        action: "accept",
        operation: "signEndUserEvmTransaction",
        criteria: [
          {
            type: "ethValue",
            ethValue: "1000000000000000000", // 1 ETH in wei
            operator: "<=",
          },
          {
            type: "evmAddress",
            addresses: ["0x000000000000000000000000000000000000dEaD"],
            operator: "in",
          },
        ],
      },
      // Restrict end-user EVM transaction sending to a specific network and max USD exposure
      {
        action: "accept",
        operation: "sendEndUserEvmTransaction",
        criteria: [
          {
            type: "evmNetwork",
            networks: ["base", "base-sepolia"],
            operator: "in",
          },
          {
            type: "netUSDChange",
            changeCents: 10000, // $100.00
            operator: "<=",
          },
        ],
      },
      // Restrict end-user EVM message signing to messages matching a specific pattern
      {
        action: "accept",
        operation: "signEndUserEvmMessage",
        criteria: [
          {
            type: "evmMessage",
            match: "^Sign in to MyApp.*",
          },
        ],
      },
      // Restrict end-user EVM typed data signing to a known verifying contract
      {
        action: "accept",
        operation: "signEndUserEvmTypedData",
        criteria: [
          {
            type: "evmTypedDataVerifyingContract",
            addresses: ["0x000000000000000000000000000000000000dEaD"],
            operator: "in",
          },
        ],
      },
      // Restrict end-user Solana transaction signing to allowlisted recipients under a SOL value threshold
      {
        action: "accept",
        operation: "signEndUserSolTransaction",
        criteria: [
          {
            type: "solAddress",
            addresses: ["11111111111111111111111111111111"],
            operator: "in",
          },
          {
            type: "solValue",
            solValue: "1000000000", // 1 SOL in lamports
            operator: "<=",
          },
        ],
      },
      // Restrict end-user Solana transaction sending to devnet with an SPL token allowlist
      {
        action: "accept",
        operation: "sendEndUserSolTransaction",
        criteria: [
          {
            type: "solNetwork",
            networks: ["solana-devnet"],
            operator: "in",
          },
          {
            type: "splAddress",
            addresses: ["11111111111111111111111111111111"],
            operator: "in",
          },
        ],
      },
      // Restrict end-user Solana message signing to messages matching a specific pattern
      {
        action: "accept",
        operation: "signEndUserSolMessage",
        criteria: [
          {
            type: "solMessage",
            match: "^Sign in to MyApp.*",
          },
        ],
      },
    ],
  },
});
console.log("Created end user policy:", policy.id);
