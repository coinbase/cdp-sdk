// Usage: pnpm tsx x402/clients/mcp/simple.ts

/**
 * Call x402-paid MCP tools with a CDP-managed wallet.
 *
 * `wrapMCPClientWithPayment` takes any `@modelcontextprotocol/sdk` Client and
 * an x402 payment client. Because `CdpX402Client` extends the base `x402Client`,
 * it drops in directly — CDP provisions the wallet and signs payments; no
 * private keys, no manual scheme registration.
 *
 * This minimal example connects, lists tools, then calls the free `ping` tool
 * and the paid `generate_report` tool. See `chatbot.ts` for an LLM-driven variant.
 *
 * Setup:
 *   1. Start the MCP server:  cd ../../servers/mcp && pnpm install && pnpm start
 *   2. Set CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET in your .env.
 *   3. Fund the printed EVM address with USDC on Base Sepolia (see the README).
 */
import "dotenv/config";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { CdpX402Client } from "@coinbase/cdp-sdk/x402";
import { wrapMCPClientWithPayment } from "@x402/mcp";

const SERVER_URL = process.env.MCP_SERVER_URL ?? "http://localhost:4022";

async function main() {
  // A CDP-managed payment client — provisions the wallet lazily and signs 402s.
  // "development" registers Base Sepolia, since the MCP server settles there.
  const payment = new CdpX402Client({ environment: "development" });
  const { evmAddress } = await payment.getAddresses();
  console.log("CDP-managed x402 MCP client ready");
  console.log("  Paying from EVM address:", evmAddress);
  console.log("  Fund it with USDC on Base Sepolia before calling paid tools.\n");

  // Wrap a standard MCP client. Only callTool() is enhanced with payment;
  // every other method is a passthrough, so full MCP compatibility is kept.
  const mcp = wrapMCPClientWithPayment(
    new Client({ name: "cdp-x402-mcp-client", version: "1.0.0" }, { capabilities: {} }),
    payment,
    {
      autoPayment: true,
      onPaymentRequested: async ({ toolName, paymentRequired }) => {
        const price = paymentRequired.accepts[0];
        console.log(`Payment required for "${toolName}": ${price.amount} ${price.asset}`);
        console.log("  Approving...\n");
        return true; // return false to decline
      },
    },
  );

  await mcp.connect(new SSEClientTransport(new URL(`${SERVER_URL}/sse`)));
  console.log("Connected to MCP server at", SERVER_URL);

  const { tools } = await mcp.listTools();
  console.log("Available tools:", tools.map(t => t.name).join(", "), "\n");

  // Free tool — no payment.
  const ping = await mcp.callTool("ping");
  console.log("ping ->", ping.content[0]?.text, `(paymentMade: ${ping.paymentMade})\n`);

  // Paid tool — CdpX402Client signs and settles automatically.
  const report = await mcp.callTool("generate_report", { topic: "USDC on Base" });
  console.log("generate_report ->", report.content[0]?.text);
  if (report.paymentResponse?.transaction) {
    console.log("Payment settled, tx:", report.paymentResponse.transaction);
  }

  await mcp.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
