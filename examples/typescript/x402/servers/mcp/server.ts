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

/** A tool handler wrapper produced by `createPaymentWrapper` — see `main()`. */
type PaymentWrapper = ReturnType<typeof createPaymentWrapper>;

/**
 * Builds a fresh `McpServer` with both tools registered.
 *
 * The MCP SDK's `Server.connect()` binds a server 1:1 to a single transport
 * and throws if you call it again on the same instance ("use a separate
 * Protocol instance per connection" — see its source). So every new SSE
 * connection needs its own `McpServer`; this factory is what `startSseServer`
 * calls per connection. `paid` is shared across all of them since it's just
 * stateless verify/settle logic, not tied to any one transport.
 *
 * @param paid - Payment wrapper from `createPaymentWrapper`, applied to the paid tool.
 * @returns A new, unconnected `McpServer` with `generate_report` and `ping` registered.
 */
function createMcpServer(paid: PaymentWrapper): McpServer {
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

  return mcpServer;
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

  startSseServer(() => createMcpServer(paid), payTo);
}

/**
 * Serves MCP over SSE via a small Express app, supporting any number of
 * concurrent clients.
 *
 * Each `GET /sse` gets its own `McpServer` (from `createServer`) and its own
 * `SSEServerTransport`, keyed by `transport.sessionId`. The transport sends
 * that session ID to the client as part of the SSE handshake, and the client
 * echoes it back as a `sessionId` query param on every `POST /messages` —
 * that's how we route each message to the right session's transport instead
 * of guessing.
 *
 * @param createServer - Builds a fresh `McpServer` for a new connection.
 * @param payTo - The receiver address, for the startup log.
 */
function startSseServer(createServer: () => McpServer, payTo: Address): void {
  const app = express();
  const transports = new Map<string, SSEServerTransport>();

  app.get("/sse", async (_req, res) => {
    const transport = new SSEServerTransport("/messages", res);
    transports.set(transport.sessionId, transport);
    res.on("close", () => transports.delete(transport.sessionId));
    await createServer().connect(transport);
  });

  app.post("/messages", express.json(), async (req, res) => {
    const sessionId = String(req.query.sessionId ?? "");
    const transport = transports.get(sessionId);
    if (!transport) {
      res.status(400).json({ error: `No active SSE session for sessionId "${sessionId}"` });
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
