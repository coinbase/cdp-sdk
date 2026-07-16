// Usage: pnpm start

/**
 * MCP server with x402-paid tools, powered by the CDP SDK.
 *
 * This is the standard `@x402/mcp` payment-wrapper setup with two CDP swaps:
 *
 *   1. The facilitator is `createCdpFacilitatorClient()` — the CDP hosted
 *      facilitator, a drop-in for a self-hosted `HTTPFacilitatorClient`.
 *   2. The receiver address is a CDP-managed Server Wallet, provisioned on
 *      startup via `CdpClient` — no private keys to manage, and it's the same
 *      wallet the CDP facilitator settles against.
 *
 * The server exposes two tools over SSE:
 *   - generate_report (paid, $0.01) — returns a mock AI report for a topic
 *   - ping             (free)       — health check
 *
 * Setup:
 *   Set CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET in your .env.
 *   (Payments are received, but a wallet secret is needed to provision the
 *   CDP receiver wallet. To skip provisioning, set PAY_TO to an EVM address.)
 *
 * Run:
 *   pnpm install
 *   pnpm start   # listens on http://localhost:4022
 */
import "dotenv/config";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { createPaymentWrapper, x402ResourceServer } from "@x402/mcp";
import { CdpClient } from "@coinbase/cdp-sdk";
import { createCdpFacilitatorClient } from "@coinbase/cdp-sdk/x402";
import express from "express";
import type { Address } from "viem";
import { z } from "zod";

const PORT = parseInt(process.env.PORT ?? "4022", 10);
// Base Sepolia — the CDP faucet funds the same wallets the facilitator settles.
const NETWORK = "eip155:84532";

/**
 * Resolves the EVM address that should receive payments.
 *
 * Uses PAY_TO if provided; otherwise provisions (or reuses) a CDP Server
 * Wallet named "x402-mcp-receiver-wallet-1" — no private keys to store.
 *
 * @returns The EVM address payments settle to.
 */
async function resolvePayTo(): Promise<Address> {
  if (process.env.PAY_TO) return process.env.PAY_TO as Address;
  const cdp = new CdpClient();
  const account = await cdp.evm.getOrCreateAccount({ name: "x402-mcp-receiver-wallet-1" });
  return account.address as Address;
}

/**
 * Produces a mock AI report for a topic. Swap for your real data source.
 *
 * @param topic - The subject to report on.
 * @returns A short report string.
 */
function generateReport(topic: string): string {
  return `AI report on "${topic}": demand is trending up, sentiment is positive, no anomalies detected.`;
}

async function main(): Promise<void> {
  const payTo = await resolvePayTo();

  // ── CDP swap #1: the hosted facilitator (drop-in for HTTPFacilitatorClient) ──
  const resourceServer = new x402ResourceServer(createCdpFacilitatorClient());
  resourceServer.register(NETWORK, new ExactEvmScheme());
  await resourceServer.initialize();

  // Build the payment requirements the paid tool advertises on a 402.
  const reportAccepts = await resourceServer.buildPaymentRequirements({
    scheme: "exact",
    network: NETWORK,
    payTo, // ── CDP swap #2: a CDP-managed receiver wallet ──
    price: "$0.01",
    extra: { name: "USDC", version: "2" }, // EIP-712 domain parameters
  });

  // createPaymentWrapper wraps any tool handler with x402 verify + settle.
  const paid = createPaymentWrapper(resourceServer, { accepts: reportAccepts });

  const mcpServer = new McpServer({ name: "x402 CDP Report Service", version: "1.0.0" });

  // Paid tool — wrap the handler with `paid(...)`.
  mcpServer.tool(
    "generate_report",
    "Generate an AI report on a topic. Requires payment of $0.01 USDC.",
    { topic: z.string().describe("The topic to generate a report about") },
    paid(async (args: { topic: string }) => ({
      content: [{ type: "text" as const, text: generateReport(args.topic) }],
    })),
  );

  // Free tool — no wrapper.
  mcpServer.tool("ping", "A free health check tool", {}, async () => ({
    content: [{ type: "text" as const, text: "pong" }],
  }));

  startSseServer(mcpServer, payTo);
}

/**
 * Serves the MCP server over SSE via a small Express app.
 *
 * @param mcpServer - The MCP server instance.
 * @param payTo - The receiver address, for the startup log.
 */
function startSseServer(mcpServer: McpServer, payTo: Address): void {
  const app = express();
  const transports = new Map<string, SSEServerTransport>();

  app.get("/sse", async (_req, res) => {
    const transport = new SSEServerTransport("/messages", res);
    const sessionId = crypto.randomUUID();
    transports.set(sessionId, transport);
    res.on("close", () => transports.delete(sessionId));
    await mcpServer.connect(transport);
  });

  app.post("/messages", express.json(), async (req, res) => {
    const transport = Array.from(transports.values())[0];
    if (!transport) {
      res.status(400).json({ error: "No active SSE connection" });
      return;
    }
    await transport.handlePostMessage(req, res, req.body);
  });

  app.get("/health", (_req, res) =>
    res.json({ status: "ok", tools: ["generate_report (paid: $0.01)", "ping (free)"] }),
  );

  app.listen(PORT, () => {
    console.log(`x402 CDP MCP server running on http://localhost:${PORT}`);
    console.log(`  Receiving EVM payments at ${payTo}`);
    console.log(`  Fund it with USDC on Base Sepolia, then connect a client via /sse.\n`);
    console.log("Tools:");
    console.log("  - generate_report (paid: $0.01)");
    console.log("  - ping (free)");
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
