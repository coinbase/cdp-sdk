// Usage: pnpm tsx x402/clients/payForSchemes.ts
// Env-driven scheme/network matrix driver for the CDP SDK's x402 example servers.
// See ../README.md for the full CLI matrix and setup instructions.
//
//   X402_API_URL             (required) the protected URL to request
//   X402_PREFERRED_NETWORK   (optional) CAIP-2 network id to force on dual-network routes
//   X402_FUND_FROM_FAUCET    (optional) "true" to auto-fund Base Sepolia USDC on startup
import "dotenv/config";

import { CdpClient } from "@coinbase/cdp-sdk";
import { CdpX402Client } from "@coinbase/cdp-sdk/x402";
import type { NetworkConfig, SchemesConfig } from "@coinbase/cdp-sdk/x402";
import { wrapFetchWithPayment } from "@x402/fetch";

import type { PaymentPolicy } from "@x402/core/client";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} env var is required.`);
  return value;
}

const X402_API_URL = requireEnv("X402_API_URL");
const PREFERRED_NETWORK = process.env.X402_PREFERRED_NETWORK;

/**
 * Restricts a dual-network `accepts` list to a single CAIP-2 network, if present.
 *
 * @param preferredNetwork - The CAIP-2 network id to prefer, if any.
 * @returns A `PaymentPolicy` to register on the client.
 */
function preferNetworkPolicy(preferredNetwork: string): PaymentPolicy {
  return (_x402Version, paymentRequirements) => {
    const onlyPreferred = paymentRequirements.filter(req => req.network === preferredNetwork);
    return onlyPreferred.length > 0 ? onlyPreferred : paymentRequirements;
  };
}

async function main() {
  const baseScheme: SchemesConfig = {
    exact: true,
    upto: true,
    authCapture: true,
  };

  // authCapture is Base-only upstream, so it's omitted for Solana.
  const networkSchemes: NetworkConfig[] = [
    { network: "base-sepolia", scheme: baseScheme },
    { network: "solana-devnet", scheme: { exact: true, upto: true } },
  ];

  const client = new CdpX402Client({
    environment: "development",
    networkSchemes,
  });

  if (PREFERRED_NETWORK) {
    client.registerPolicy(preferNetworkPolicy(PREFERRED_NETWORK));
  }

  const { evmAddress, svmAddress } = await client.getAddresses();
  console.log("CDP-managed x402 client ready");
  console.log("  EVM address:", evmAddress);
  console.log("  Solana address:", svmAddress);
  console.log("  Schemes:", networkSchemes);
  if (PREFERRED_NETWORK) console.log("  Preferred network:", PREFERRED_NETWORK);
  console.log();

  if (process.env.X402_FUND_FROM_FAUCET === "true") {
    console.log("Requesting Base Sepolia USDC from the CDP faucet...");
    try {
      const cdpClient = new CdpClient();
      const { transactionHash } = await cdpClient.evm.requestFaucet({
        address: evmAddress,
        network: "base-sepolia",
        token: "usdc",
      });
      console.log(`  Faucet tx: ${transactionHash}`);
      console.log("  Wait for it to confirm, then re-run without the flag to pay.\n");
      return;
    } catch {
      console.warn(
        "  Faucet request failed — you may already be funded, or hit the project limit.",
      );
    }
  }

  const fetchWithPayment = wrapFetchWithPayment(globalThis.fetch, client);

  console.log(`Requesting: ${X402_API_URL}`);
  const response = await fetchWithPayment(X402_API_URL);

  console.log(`HTTP ${response.status} ${response.statusText}`);

  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? JSON.stringify(await response.json(), null, 2)
    : await response.text();
  console.log(
    "Response body:",
    body.length > 1000 ? `${body.slice(0, 1000)}… (${body.length} bytes)` : body,
  );

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
