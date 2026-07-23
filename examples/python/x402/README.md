# x402 examples

These examples combine the CDP SDK with the x402 Foundation SDK:

- Clients use CDP-managed wallets to sign payments.
- Servers use `cdp.x402.create_facilitator_config()` to verify and settle through the CDP
  Facilitator.

Run commands from `examples/python` after completing the setup in the
[parent README](../README.md).

## Examples

- **Bazaar server:** `servers/bazaar.py` runs a paid HTTP API and declares discovery metadata
  so its routes can be indexed in the CDP Bazaar.
- **MCP server:** `servers/mcp/server.py` exposes free and paid MCP tools.
- **MCP client:** `clients/mcp/simple.py` calls the MCP server and pays for its paid tool with
  a CDP-managed wallet.

Use the Bazaar example when you are building a discoverable HTTP resource. Use the MCP pair
when you are building or calling paid MCP tools.

## Run the Bazaar server

Set `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`, `EVM_ADDRESS`, and `SVM_ADDRESS` in `.env`, then
run:

```bash
uv run python x402/servers/bazaar.py
```

The server listens on `http://localhost:4021`.

## Run the MCP examples

Set `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`, and `CDP_WALLET_SECRET` in `.env`.

Start the server:

```bash
uv run python x402/servers/mcp/server.py
```

In another terminal, run the client:

```bash
uv run python x402/clients/mcp/simple.py
```

The MCP server provisions a CDP-managed receiver wallet. Set `PAY_TO` to use an existing EVM
address instead. To fund the client's Base Sepolia wallet automatically, set
`CDP_FUND_FROM_FAUCET=true`.
