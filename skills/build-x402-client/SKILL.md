---
name: build-x402-client
description: |
  Write code that pays for an HTTP API returning 402 Payment Required, using the x402 protocol and
  a CDP-managed wallet. Covers TypeScript and Python. Use when the user wants to call a paid
  endpoint from their own application or agent, add x402 payments to an HTTP client, hit an API
  that charges per request, migrate an existing x402 client off a raw private key, or is stuck on
  an unexpected 402 response.
compatibility: Requires a CDP API key and wallet secret. Node.js >= 22 (TypeScript) or Python >= 3.10.
metadata:
  author: cdp@coinbase.com
  version: "0.1.0"
---

# Build an x402 client

Take the user from nothing to one successful paid API call: resolve a CDP-managed wallet, wrap
their HTTP client so it answers `402` automatically, fund the wallet on testnet, verify with a
`200`.

Resolve the Decisions table below before writing any code, then read only the language subsection
you resolved to in step 3. This file covers TypeScript and Python; reading both will blend them.

## When not to use this skill

- **The user's end users should pay from their own wallets.** That is
  [x402 payments with User Wallets](https://docs.cdp.coinbase.com/wallets/using-wallets/x402-payments),
  a browser flow, not this server-side one.
- **The user wants an agent to spend money now, without writing code.** Use the agentic-wallet
  [pay-for-service](https://docs.cdp.coinbase.com/agentic-wallet/cli/skills/pay-for-service) skill,
  which drives the `awal` CLI. It is the nearest neighbour to this skill and the most likely
  mis-selection.
- **The user is the one charging.** Use the `build-x402-server` skill.
- **The user needs to construct and sign a payment by hand** (`signX402Payment`, custom retry
  logic). Out of scope here; see
  [Client configuration](https://docs.cdp.coinbase.com/x402/buyer/client-configuration).

## Decisions

Resolve every row before writing code. Detect first; only ask when detection is ambiguous.

| Decision       | How to detect                                                                                    | Ask only if                | Default                  |
| -------------- | ------------------------------------------------------------------------------------------------ | -------------------------- | ------------------------ |
| Language       | `package.json` -> TypeScript. `pyproject.toml` / `requirements.txt` -> Python.                   | Both present, or neither   | Ask                      |
| HTTP client    | TS: `axios` in deps -> axios, else `fetch`. Python: `httpx` or any `async def` -> httpx, `requests` -> requests. | No HTTP client in deps     | TS `fetch`, Python httpx |
| Network        | `environment: "development"` selects Base testnet.                                               | Never assume mainnet       | `development`            |
| Transport      | An MCP server URL or an existing MCP client -> MCP variant. A plain URL -> HTTP.                 | Unclear what the target is | HTTP                     |
| Starting point | An existing x402 client holding a raw private key -> migration path.                             | —                          | Fresh integration        |

The network row is a hard rule, not a preference: **never move the user to Base mainnet unless they
ask for it in the current turn**, because mainnet payments spend real USDC.

## Steps

### 1. Confirm credentials

Before installing anything, check that the environment has all three of `CDP_API_KEY_ID`,
`CDP_API_KEY_SECRET`, and `CDP_WALLET_SECRET`. The API key authenticates the caller to CDP; the
wallet secret is what lets the SDK sign payments. Missing either one fails at runtime, and it is a
worse experience to discover that three steps in. Send the user to
[API key authentication](https://docs.cdp.coinbase.com/wallets/quickstart/api-key-auth) if they have
no key yet. Also confirm the runtime: Node.js 22 or later, or Python 3.10 or later.

### 2. Install

Pick the dependencies matching the Decisions table. `@x402/core`, `@x402/evm`, `@x402/svm`, and
`@x402/extensions` are optional peer dependencies of the CDP SDK, so they are not installed for you,
and all four are needed even for an EVM-only integration because `@coinbase/cdp-sdk/x402` imports
them at module load.

For TypeScript, use the package manager already configured in the project. If none is configured,
use npm. Install:

- **fetch:** `@coinbase/cdp-sdk`, `@x402/core`, `@x402/evm`, `@x402/svm`,
  `@x402/extensions`, and `@x402/fetch`
- **axios:** the same packages with `@x402/axios` instead of `@x402/fetch`, plus `axios`
- **MCP:** the same packages with `@x402/mcp` instead of `@x402/fetch`, plus
  `@modelcontextprotocol/sdk`

For Python, use the package manager already configured in the project. If none is configured, use
pip. Install:

- **async:** `cdp-sdk` and `x402[evm,svm,httpx]`
- **sync:** `cdp-sdk` and `x402[evm,svm,requests]`

### 3. Write the client

Read only the subsection matching the language resolved above.

#### TypeScript

`CdpX402Client` is the whole point of the TypeScript path. It provisions the wallet, registers the
payment schemes, and already satisfies the signer interface the x402 wrappers expect, so it drops
into any of them unchanged.

```typescript
import { CdpX402Client } from "@coinbase/cdp-sdk/x402";
import { wrapFetchWithPayment } from "@x402/fetch";

const client = new CdpX402Client({ environment: "development" });

// The wallet lives inside the client, so print the address to know what to fund.
const { evmAddress } = await client.getAddresses();
console.log(`Paying from ${evmAddress}`);

const fetchWithPayment = wrapFetchWithPayment(globalThis.fetch, client);
const response = await fetchWithPayment("https://x402.vercel.app/protected");
console.log(`HTTP ${response.status}`);
```

There is no key to store anywhere — that is the reason a developer reaches for CDP here, so say so
rather than burying it.

Three things that break first:

- Top-level `await` needs ESM or an `async main()`. In a CommonJS project this is the first error.
- Omitting `environment` means Base mainnet and real USDC.
- `getAddresses()` also returns `svmAddress` for Solana. The field is `svmAddress`, not
  `solanaAddress`.

**axios:** same client object, different wrapper — `wrapAxiosWithPayment(axios.create(), client)`
from `@x402/axios`, which returns a wrapped axios instance.

**MCP:** paying for tool calls rather than routes, with `wrapMCPClientWithPayment(mcpClient,
client)` from `@x402/mcp`. See `clients/mcp/simple.ts` below.

**Migration:** swap whatever signer the existing `x402Client` holds for `CdpX402Client`; the call
sites stay where they are. See `x402DevMigration.ts` below.

#### Python

There is no `CdpX402Client` in Python, so assemble the pieces by hand rather than hunting for a
one-liner that does not exist.

```python
import asyncio

from cdp import CdpClient
from cdp.evm_local_account import EvmLocalAccount
from x402 import x402Client
from x402.http.clients import x402HttpxClient
from x402.mechanisms.evm import EthAccountSigner
from x402.mechanisms.evm.exact import ExactEvmScheme


async def main() -> None:
    async with CdpClient() as cdp:
        account = await cdp.evm.get_or_create_account(name="x402-client-wallet-1")
        signer = EthAccountSigner(EvmLocalAccount(account))
        print(f"Paying from {signer.address}")  # this is the address to fund

        payment_client = x402Client()
        payment_client.register("eip155:84532", ExactEvmScheme(signer))

        async with x402HttpxClient(payment_client) as http:
            response = await http.get("https://x402.vercel.app/protected")
            await response.aread()

        print(f"HTTP {response.status_code}")


asyncio.run(main())
```

`EvmLocalAccount` and the x402 signer protocol declare `sign_typed_data` differently, and
`EthAccountSigner` is what reconciles them. Writing the wrap explicitly is a readability choice
rather than a requirement: `ExactEvmScheme` already auto-wraps anything that is an `eth_account`
`BaseAccount`, which `EvmLocalAccount` is, so passing the account directly works too. Keep the
explicit form so the adaptation is visible. A type checker may flag it, since `EvmLocalAccount`
subclasses `BaseAccount` rather than `LocalAccount`; at runtime it is correct.

Three things that break first:

- `CdpClient` is an async context manager. Resolve the account inside `async with`.
- On the httpx path, `await response.aread()` before touching the body.
- `"eip155:84532"` is Base Sepolia. Changing it is a deliberate network change.

**requests:** the sync alternative for a project with no async entry point. `x402_requests(client)`
from `x402.http.clients` is a function that returns a `requests.Session`, and it needs
`x402ClientSync` rather than `x402Client` — mixing the two raises a `TypeError`.

**MCP:** see `clients/mcp/simple.py` below.

### 4. Fund the wallet

Run the client once. With no USDC it fails, and it prints the address to fund. Send Base Sepolia
USDC there:

```typescript
import { CdpClient } from "@coinbase/cdp-sdk";

await new CdpClient().evm.requestFaucet({
  address: evmAddress,
  network: "base-sepolia",
  token: "usdc",
});
```

```python
await cdp.evm.request_faucet(address=signer.address, network="base-sepolia", token="usdc")
```

The CDP faucet funds the same wallets the CDP Facilitator settles against, so there is no second
faucet to find. Wait for the transfer to confirm before re-running — requesting and paying in the
same run fails on an empty balance.

### 5. Verify

Re-run. `HTTP 200` is the success signal, and it proves the whole path: the payment was verified,
settled onchain, and the protected resource came back. If the user has no endpoint of their own
yet, `https://x402.vercel.app/protected` charges $0.01 on Base Sepolia.

## Troubleshooting

| Symptom                            | Cause                                                          | Fix                                                            |
| ---------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------- |
| `402` no matter how often you retry | Wallet holds no USDC, or the faucet transfer has not confirmed | Check the balance of the printed address before retrying       |
| Python `TypeError` on the client   | A sync client paired with async pieces, or the reverse         | `x402_requests` needs `x402ClientSync`; `x402HttpxClient` needs `x402Client` |
| Wallet authentication error        | `CDP_WALLET_SECRET` missing or wrong                           | It is separate from the API key secret; check both             |
| No scheme registered for network   | Registered chain ID differs from the one the server asks for   | Match the `network` in the `402` response                      |
| Payment exceeds balance            | —                                                              | Report the shortfall in USDC, not atomic units: 10000 is $0.01 |

## Runnable examples

TypeScript, under `https://github.com/coinbase/cdp-sdk/blob/main/examples/typescript/x402/clients/`:
`payForApi.ts`, `payForApiWithAxios.ts`, `payForApiWithSpendControls.ts`, `x402DevMigration.ts`,
`mcp/simple.ts`.

Python, under `https://github.com/coinbase/cdp-sdk/blob/main/examples/python/x402/clients/`:
`pay_for_api.py`, `pay_for_api_with_requests.py`, `mcp/simple.py`.

## Beyond the first paid call

- Spend limits, allowlists, lifecycle hooks: [Client configuration](https://docs.cdp.coinbase.com/x402/buyer/client-configuration)
- Finding services to pay for: [Discover services](https://docs.cdp.coinbase.com/x402/buyer/discover-services)
- Discovery and payment over MCP: [Discover and pay over MCP](https://docs.cdp.coinbase.com/x402/buyer/mcp-payments)
- Mainnet: drop `environment: "development"`, fund with real USDC, and confirm with the user first
