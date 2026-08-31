// Usage: pnpm tsx x402/clients/payForSchemes.ts

/**
 * Scheme/network matrix driver for the CDP SDK's x402 example servers.
 *
 * Unlike `payForApi.ts` (a simple fixed demo), this script is meant to be
 * driven entirely from environment variables so it can be scripted against
 * every scheme + network combination the CDP SDK's `CdpX402Client` supports:
 *
 *   - `X402_API_URL`             (required) the protected URL to request.
 *   - `X402_PREFERRED_NETWORK`   (optional) a CAIP-2 network id
 *     (e.g. `eip155:84532`, `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1`).
 *     Registered as an `x402Client` policy so a dual-network route (like
 *     `GET /report`, which accepts both Base Sepolia and Solana Devnet) can
 *     be forced onto one network instead of taking the client's default
 *     selection.
 *
 * `exact`, `upto`, and `authCapture` are all registered by default (matching
 * `CdpX402Client`'s own defaults on Base) — no scheme opt-in flag is needed.
 *
 * Exits non-zero (after printing the error) on any failure, so it can be
 * used as a pass/fail check in a shell script or CI matrix.
 *
 * See `examples/typescript/x402/README.md` for the full CLI matrix this
 * script is meant to drive, including which server + route to pair with
 * each scheme/network combination.
 *
 * Setup:
 *   Set CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET in your .env
 *
 * Funding the wallet (Base Sepolia USDC / Solana Devnet):
 *   The script prints the client's wallet addresses upfront via
 *   `client.getAddresses()`. Fund them before paying, or set
 *   X402_FUND_FROM_FAUCET=true to auto-request Base Sepolia USDC from the
 *   CDP faucet on startup (Solana Devnet SOL must still be funded manually).
 */
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

/*
 * The auth-capture smoke test expects a non-2xx response: there is no live
 * auth-capture server in either repo, so the mock route returns one after the
 * client successfully signs and sends its payment payload (proving
 * `CdpX402Client.createPaymentPayload` works for `authCapture`) without a
 * real facilitator settling it. See the README for the full explanation.
 */
const IS_AUTH_CAPTURE_SMOKE_TEST = X402_API_URL.includes("/auth-capture-mock");

/**
 * Restricts a dual-network `PaymentRequired.accepts` list down to a single
 * CAIP-2 network, when that network is actually one of the options. Falls
 * back to the unfiltered list otherwise (e.g. a single-network route, or a
 * network the route doesn't offer — better to let selection fail with a
 * clear upstream error than silently filter everything out here).
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
  const baseScheme: SchemesConfig = { exact: true, upto: true, authCapture: true };

  // CdpX402Client only prescribes Base by default; add Solana Devnet
  // explicitly. authCapture is skipped with a warning for Solana regardless
  // — it's Base-only upstream.
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
  console.log("  Schemes:", { ...baseScheme });
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
    if (IS_AUTH_CAPTURE_SMOKE_TEST) {
      console.log(
        "Non-2xx response from the auth-capture-mock route — expected for the auth-capture " +
          "smoke test (payload signed and sent, no live settlement). Treating as success.",
      );
      return;
    }
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
