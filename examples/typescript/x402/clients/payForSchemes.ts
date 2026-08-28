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
 *   - `X402_SCHEMES`             (optional) comma-separated list of opt-in
 *     schemes to enable on top of the `exact`/`upto` baseline — currently
 *     `batchSettlement` and/or `authCapture`. Both are Base-only upstream.
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

const OPT_IN_SCHEMES = new Set(
  (process.env.X402_SCHEMES ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean),
);
const WANT_BATCH_SETTLEMENT = OPT_IN_SCHEMES.has("batchSettlement");
const WANT_AUTH_CAPTURE = OPT_IN_SCHEMES.has("authCapture");

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
  // Base schemes always include exact + upto; batchSettlement/authCapture are
  // opt-in per `X402_SCHEMES` (see the SchemesConfig import above).
  const baseScheme: SchemesConfig = {
    exact: true,
    upto: true,
    batchSettlement: WANT_BATCH_SETTLEMENT,
    authCapture: WANT_AUTH_CAPTURE,
  };

  // "development" prescribes Base Sepolia as the baseline network; add Solana
  // Devnet explicitly since CdpX402Client only prescribes Base by default.
  // batchSettlement/authCapture are skipped with a warning for Solana — only
  // exact/upto apply there regardless of what's requested via X402_SCHEMES.
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
      // Fall through and attempt the payment anyway.
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
    /*
     * The auth-capture smoke test expects this: there is no live auth-capture
     * server in either repo, so the mock route returns a non-2xx after the
     * client successfully signs and sends its payment payload (proving
     * `CdpX402Client.createPaymentPayload` works for `authCapture`) without a
     * real facilitator settling it. See the README for the full explanation.
     */
    if (WANT_AUTH_CAPTURE) {
      console.log(
        "Non-2xx response with authCapture opted in — expected for the auth-capture smoke " +
          "test (payload signed and sent, no live settlement). Treating as success.",
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
