# x402 examples

These examples combine the CDP SDK with the x402 Foundation SDK:

- Clients use CDP-managed wallets to sign payments.
- Servers use `cdp.x402.create_facilitator_config()` to verify and settle through the CDP
  Facilitator.

Run commands from `examples/python` after completing the setup in the
[parent README](../README.md).

## Examples

- **HTTP client:** `clients/pay_for_api.py` pays for an x402-protected API over **httpx**
  (async). `clients/pay_for_api_with_requests.py` is the same flow over **requests** (sync).
- **HTTP server:** `servers/fastapi/server.py` charges for a route on **FastAPI**.
  `servers/flask/server.py` is the same server on **Flask**.
- **Bazaar server:** `servers/bazaar.py` runs a paid HTTP API and declares discovery metadata
  so its routes can be indexed in the CDP Bazaar.
- **MCP server:** `servers/mcp/server.py` exposes free and paid MCP tools.
- **MCP client:** `clients/mcp/simple.py` calls the MCP server and pays for its paid tool with
  a CDP-managed wallet.

Start with an HTTP client to make your first paid call, or an HTTP server to charge for your
first route. Use the Bazaar example when you are building a discoverable HTTP resource, and the
MCP pair when you are building or calling paid MCP tools.

## Run the HTTP clients

Set `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`, and `CDP_WALLET_SECRET` in `.env`, then run:

```bash
uv run python x402/clients/pay_for_api.py
uv run python x402/clients/pay_for_api_with_requests.py
```

Both pay on Base Sepolia with a CDP-managed wallet and print the settled transaction hash.
Each prints the address it pays from — fund that address with Base Sepolia USDC, or run once
with `CDP_FUND_FROM_FAUCET=true` to request USDC from the CDP faucet. That run requests the
funds and exits; re-run without the flag once the transfer confirms. Set `X402_API_URL` to
point at a different x402-protected endpoint.

## Run the HTTP servers

Set `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`, and `CDP_WALLET_SECRET` in `.env`, then run either:

```bash
uv run python x402/servers/fastapi/server.py
uv run python x402/servers/flask/server.py
```

Both listen on `http://localhost:8402` and charge $0.01 for `GET /report` on Base Sepolia. Each
provisions a CDP-managed receiver wallet and prints its address on startup; set `PAY_TO` to
receive at an address you already control and skip provisioning (`CDP_WALLET_SECRET` is then
unnecessary). Confirm the 402 with `curl -i http://localhost:8402/report`, then pay it from
another terminal:

```bash
X402_API_URL=http://localhost:8402/report uv run python x402/clients/pay_for_api.py
```

## Run the Bazaar server

Set `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`, `EVM_ADDRESS`, and `SVM_ADDRESS` in `.env`, then
run:

```bash
uv run python x402/servers/bazaar.py
```

The server listens on `http://localhost:4021`.

## Ports

Each server has its own default port: `8402` for FastAPI and Flask, `4021` for the Bazaar
server, `4022` for the MCP server. `PORT` overrides whichever server you run, so set it on the
command line rather than in `.env`, where it would move every server at once. The MCP client
reads `MCP_SERVER_URL` (default `http://localhost:4022`) to find its server.

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
address instead. To fund the client's Base Sepolia wallet, run the client once with
`CDP_FUND_FROM_FAUCET=true`, then again without it.
