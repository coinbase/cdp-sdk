# CDP route configuration

Route configuration tells the CDP server which HTTP endpoints require payment,
what price to charge, which networks to accept, and where to send funds.

This document covers the **CDP-specific route configuration format**
(`CdpRouteConfig`) used with `createCdpResourceServer` /
`create_cdp_resource_server`. The CDP middleware helpers
(`createCdpExpressMiddleware`, `createCdpHonoMiddleware`,
`createCdpPaymentProxy`) accept the full x402 `RoutesConfig` format directly
and do not expand the simplified price-only CDP route format.

If you need the full x402 `RouteConfig`/`AcceptConfig` format (e.g. to specify
an explicit `payTo` address or a custom scheme), refer to the
[x402 documentation](https://github.com/x402-foundation/x402/blob/main/docs/getting-started/quickstart-for-sellers.mdx).

## CDP route format

The CDP format is the simplest option. Supply a `price` and optional metadata —
the server auto-provisions a CDP receiver wallet and fills in all x402
internals automatically.

```typescript
import { createCdpResourceServer } from "@coinbase/x402/server";

const server = await createCdpResourceServer({
  routes: {
    "GET /report": {
      price: "$0.01",
      description: "AI-generated report",
    },
    "POST /generate": {
      price: "$0.05",
      description: "Image generation endpoint",
      // Accept payments on Base Sepolia only (default is Base + Solana mainnet)
      networks: ["eip155:84532"],
      maxTimeoutSeconds: 60,
    },
  },
});
```

### `CdpRouteConfig` fields

| Field               | Type                | Required | Default                       | Description                                                                         |
| ------------------- | ------------------- | -------- | ----------------------------- | ----------------------------------------------------------------------------------- |
| `price`             | `string`            | Yes      | —                             | Payment amount, e.g. `"$0.01"`                                                      |
| `description`       | `string`            | No       | —                             | Human-readable description of the resource                                          |
| `networks`          | `string[]`          | No       | Base mainnet + Solana mainnet | CAIP-2 network IDs to accept payments on                                            |
| `maxTimeoutSeconds` | `number`            | No       | `300`                         | Seconds before a payment token expires                                              |
| `scheme`            | `"exact" \| "upto"` | No       | `"exact"`                     | Payment scheme; `"upto"` allows the buyer to pay up to the stated amount (EVM only) |
| `extensions`        | `CdpExtensions`     | No       | Auto-injected                 | Extension overrides (see [Extensions](#extensions))                                 |

### Default networks

When `networks` is omitted, the route accepts payments on:

- `eip155:8453` — Base mainnet (EVM)
- `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` — Solana mainnet

Use `networks` to restrict to specific chains or to enable testnets:

```typescript
// Base Sepolia only
networks: ["eip155:84532"];

// Base + Polygon
networks: ["eip155:8453", "eip155:137"];

// Solana devnet only
networks: ["solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1"];
```

## Route key format

Route keys use the `"METHOD /path"` convention:

```
"GET /report"
"POST /users/:id"
"DELETE /sessions"
```

Wildcard methods (`"* /path"`) are accepted by some middleware but are not
supported in the CDP route format.

## Config file

Both `createCdpResourceServer` (TypeScript) and `create_cdp_resource_server`
(Python) can load routes (and optionally credentials) from a JSON file via
`configPath` / `config_path`. The file schema is identical to
`CdpResourceServerConfig` (minus `configPath` / `config_path` itself):

```json
{
  "routes": {
    "GET /report": {
      "price": "$0.01",
      "description": "AI-generated report"
    },
    "POST /generate": {
      "price": "$0.05",
      "networks": ["eip155:8453"]
    }
  }
}
```

```typescript
const server = await createCdpResourceServer({
  configPath: "./x402.config.json",
});
```

```python
server = await create_cdp_resource_server({"config_path": "./x402.config.json"})
```

Inline config fields always take precedence over file config when both are
provided. `configPath` / `config_path` inside the file is ignored to prevent
circular references.

## Extensions

### CDP auto-injected extensions

The CDP resource server (`createCdpResourceServer` / `create_cdp_resource_server`)
automatically injects the following extensions into every route:

- **Bazaar discovery** — registers the route with the CDP Bazaar discovery
  index using the route's HTTP method and path.
- **EIP-2612 gas sponsoring** — enables SCW gas sponsorship for EVM payments.
- **ERC-20 approval gas sponsoring** — enables ERC-20 approval sponsorship.

### Overriding Bazaar metadata

To enrich Bazaar discovery with query parameter examples, output schemas, or
other metadata, override the Bazaar extension in the route config:

```typescript
import { CDP_EXTENSION_BAZAAR } from "@coinbase/x402/extensions";

routes: {
  "GET /search": {
    price: "$0.01",
    extensions: {
      [CDP_EXTENSION_BAZAAR]: {
        info: {
          input: {
            type: "http",
            method: "GET",
            queryParams: { q: "example search term" },
          },
          output: { type: "json", example: { results: [] } },
        },
        routeTemplate: "/search",
      },
    },
  },
},
```

User-provided extension values always override the auto-generated ones.
