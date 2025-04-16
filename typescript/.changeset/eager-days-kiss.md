---
"@coinbase/cdp-sdk": minor
---

Add support for configuring `CdpClient` via environment variables.

Developers can now simply set the following environment variables in their shell:

```bash
export CDP_API_KEY_NAME=your-api-key-id
export CDP_API_KEY_SECRET=your-api-key-secret
export CDP_WALLET_SECRET=your-wallet-secret
```

And configure the `CdpClient` like so:

```typescript
import { CdpClient } from "@coinbase/cdp-sdk";

const cdp = new CdpClient();
```

Or, load from a `.env` file:

```bash
# .env
CDP_API_KEY_NAME=your-api-key-id
CDP_API_KEY_SECRET=your-api-key-secret
CDP_WALLET_SECRET=your-wallet-secret
```

And configure the `CdpClient` like so:

```typescript
import { CdpClient } from "@coinbase/cdp-sdk";
import { config } from "dotenv";

config();

const cdp = new CdpClient();
```
