// Usage: pnpm tsx x402/clients/mcp/chatbot.ts

/**
 * A chatbot that pays for MCP tools on your behalf, using:
 *   - Claude (Anthropic SDK) as the LLM that decides when to call tools
 *   - an MCP client for tool discovery + execution
 *   - a CDP-managed wallet (CdpX402Client) that signs x402 payments
 *
 * Claude sees the MCP server's tools, decides when to call the paid
 * `generate_report` tool, and the CDP wallet settles the $0.01 payment
 * transparently. You just chat.
 *
 * Setup:
 *   1. Start the MCP server:  cd ../../servers/mcp && pnpm install && pnpm start
 *   2. Set in your .env:
 *        ANTHROPIC_API_KEY   — for Claude
 *        CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET — for payments
 *   3. Fund the printed EVM address with USDC on Base Sepolia (see the README).
 *
 * Try: "Give me a report on the ETH market" or "ping the server".
 */
import "dotenv/config";

import * as readline from "node:readline/promises";
import Anthropic from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { CdpX402Client } from "@coinbase/cdp-sdk/x402";
import { wrapMCPClientWithPayment } from "@x402/mcp";

const SERVER_URL = process.env.MCP_SERVER_URL ?? "http://localhost:4022";
const MODEL = "claude-opus-4-8";

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY env var required");

  const anthropic = new Anthropic();

  // CDP-managed wallet that auto-pays x402-protected MCP tools.
  const payment = new CdpX402Client();
  const { evmAddress } = await payment.getAddresses();
  console.log("Chatbot wallet (fund with USDC on Base Sepolia):", evmAddress, "\n");

  const mcp = wrapMCPClientWithPayment(
    new Client({ name: "cdp-x402-chatbot", version: "1.0.0" }, { capabilities: {} }),
    payment,
    {
      autoPayment: true,
      onPaymentRequested: async ({ toolName, paymentRequired }) => {
        const price = paymentRequired.accepts[0];
        console.log(`\n[payment] ${toolName} costs ${price.amount} ${price.asset} — approving\n`);
        return true;
      },
    },
  );
  await mcp.connect(new SSEClientTransport(new URL(`${SERVER_URL}/sse`)));

  // Expose the MCP server's tools to Claude in its tool-use format.
  const { tools } = await mcp.listTools();
  const claudeTools: Anthropic.Tool[] = tools.map(t => ({
    name: t.name,
    description: t.description ?? "",
    input_schema: t.inputSchema as Anthropic.Tool.InputSchema,
  }));
  console.log("Connected. Claude can use:", tools.map(t => t.name).join(", "));
  console.log('Type a message ("quit" to exit).\n');

  const messages: Anthropic.MessageParam[] = [];
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  while (true) {
    const input = (await rl.question("You: ")).trim();
    if (!input) continue;
    if (input.toLowerCase() === "quit") break;

    messages.push({ role: "user", content: input });

    // Agentic loop: let Claude call tools until it produces a final answer.
    while (true) {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        tools: claudeTools,
        messages,
      });
      messages.push({ role: "assistant", content: response.content });

      for (const block of response.content) {
        if (block.type === "text" && block.text.trim()) console.log("Bot:", block.text);
      }

      if (response.stop_reason !== "tool_use") break;

      // Execute each tool Claude requested via the (paying) MCP client.
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== "tool_use") continue;
        try {
          const result = await mcp.callTool(block.name, block.input as Record<string, unknown>);
          // MCP content is forwarded verbatim from the server (text is typed
          // `unknown`), so coerce to a string for the tool_result block.
          const text = result.content[0]?.text;
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: typeof text === "string" ? text : "(no content)",
          });
        } catch (err) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: `Error: ${err}`,
            is_error: true,
          });
        }
      }
      messages.push({ role: "user", content: toolResults });
    }
    console.log();
  }

  rl.close();
  await mcp.close();
  console.log("Goodbye!");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
